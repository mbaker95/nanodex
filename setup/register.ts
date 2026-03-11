/**
 * Step: register — Write channel registration config, create group folders.
 *
 * Accepts --channel to specify the messaging platform (whatsapp, telegram, slack, discord).
 * Uses parameterized SQL queries to prevent injection.
 */
import fs from 'fs';
import path from 'path';

import { STORE_DIR } from '../src/config.ts';
import { initDatabase, setRegisteredGroup } from '../src/db.ts';
import { isValidGroupFolder } from '../src/group-folder.ts';
import { logger } from '../src/logger.ts';
import { emitStatus } from './status.ts';

interface RegisterArgs {
  jid: string;
  name: string;
  trigger: string;
  folder: string;
  channel: string;
  requiresTrigger: boolean;
  isMain: boolean;
  assistantName: string;
}

const DEFAULT_ASSISTANT_NAME = 'Andy';

const GLOBAL_AGENTS_TEMPLATE = `# {{ASSISTANT_NAME}}

You are {{ASSISTANT_NAME}}, a personal assistant for chat-based work.

## Core Behavior

- Answer questions directly.
- Use tools when they materially help.
- Send concise messages that read cleanly on chat clients.
- Avoid markdown headings in outbound messages.

## Tools

- \`mcp__nanodex__send_message\` sends a message immediately while you continue working.
- \`mcp__nanodex__schedule_task\`, \`mcp__nanodex__list_tasks\`, \`mcp__nanodex__update_task\`, \`mcp__nanodex__pause_task\`, \`mcp__nanodex__resume_task\`, and \`mcp__nanodex__cancel_task\` manage scheduled work.
- \`agent-browser\` is available for real-browser automation.

## Workspace

- Your writable workspace is \`/workspace/context/group\`.
- Shared instructions for every group live in \`/workspace/context/AGENTS.md\`.
- Extra mounted directories appear under \`/workspace/extra\`.

## Messaging

- Prefer plain text with short paragraphs or simple bullets.
- Use \`*bold*\`, \`_italic_\`, bullets, and fenced code blocks only when needed.
- If you need to think privately, wrap that text in \`<internal>...</internal>\`.

## Memory

- Store durable facts in files in the workspace.
- Keep files small and organized.
- Update shared/global instructions only when the user explicitly asks to remember something globally.
`;

const MAIN_GROUP_TEMPLATE = `# {{ASSISTANT_NAME}}

You are {{ASSISTANT_NAME}}, operating in the main control group.

## Scope

- This is the admin channel.
- You can inspect the project at \`/workspace/project\` in read-only mode.
- You can manage groups, scheduled tasks, and shared instructions.

## Tools

- \`mcp__nanodex__send_message\` for immediate progress updates.
- \`mcp__nanodex__register_group\` to activate a new group.
- Task tools under \`mcp__nanodex__*\` for scheduled work.

## Files and Paths

- Writable group workspace: \`/workspace/context/group\`
- Shared global instructions: \`/workspace/context/AGENTS.md\`
- Available groups snapshot: \`/workspace/ipc/available_groups.json\`
- Current task snapshot: \`/workspace/ipc/current_tasks.json\`
- Read-only host project mirror: \`/workspace/project\`

## Group Management

- Use \`available_groups.json\` to find unregistered groups.
- Register groups with channel-prefixed folder names such as \`whatsapp_family-chat\` or \`telegram_dev-team\`.
- Only the main group should update shared instructions at \`/workspace/context/AGENTS.md\`.

## Messaging

- Keep admin replies concise and operational.
- Do not use markdown headings in outbound chat messages.
- Use \`<internal>\` tags for recap text that should stay out of the user-visible message stream.
`;

const GROUP_TEMPLATE = `# {{ASSISTANT_NAME}}

You are {{ASSISTANT_NAME}}, helping in this chat.

## Scope

- Stay focused on the people and work in this group.
- Use the shared instructions in \`/workspace/context/AGENTS.md\` plus any files in this workspace.
- Treat this chat as its own memory and operating context.

## Messaging

- Reply in a concise, chat-friendly way.
- Prefer short paragraphs or simple bullets over long essays.
- Avoid markdown headings in outbound messages.

## Memory

- Keep durable notes in files inside this workspace when they will help later.
- Do not change shared global instructions unless the user explicitly asks to update them for every group.
`;

export function applyAssistantName(
  content: string,
  assistantName: string,
): string {
  return content
    .replace(/^# Andy$/m, `# ${assistantName}`)
    .replace(/You are Andy/g, `You are ${assistantName}`);
}

export function renderAgentsTemplate(
  template: string,
  assistantName: string,
): string {
  return template.replaceAll('{{ASSISTANT_NAME}}', assistantName);
}

function seedAgentsFile(
  agentsPath: string,
  legacyPath: string,
  template: string,
  assistantName: string,
): void {
  if (fs.existsSync(agentsPath)) {
    return;
  }

  const seededContent = fs.existsSync(legacyPath)
    ? applyAssistantName(fs.readFileSync(legacyPath, 'utf-8'), assistantName)
    : renderAgentsTemplate(template, assistantName);

  fs.writeFileSync(agentsPath, seededContent);
}

function parseArgs(args: string[]): RegisterArgs {
  const result: RegisterArgs = {
    jid: '',
    name: '',
    trigger: '',
    folder: '',
    channel: 'whatsapp', // backward-compat: pre-refactor installs omit --channel
    requiresTrigger: true,
    isMain: false,
    assistantName: DEFAULT_ASSISTANT_NAME,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--jid':
        result.jid = args[++i] || '';
        break;
      case '--name':
        result.name = args[++i] || '';
        break;
      case '--trigger':
        result.trigger = args[++i] || '';
        break;
      case '--folder':
        result.folder = args[++i] || '';
        break;
      case '--channel':
        result.channel = (args[++i] || '').toLowerCase();
        break;
      case '--no-trigger-required':
        result.requiresTrigger = false;
        break;
      case '--is-main':
        result.isMain = true;
        break;
      case '--assistant-name':
        result.assistantName = args[++i] || DEFAULT_ASSISTANT_NAME;
        break;
    }
  }

  return result;
}

export async function run(args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const parsed = parseArgs(args);

  if (!parsed.jid || !parsed.name || !parsed.trigger || !parsed.folder) {
    emitStatus('REGISTER_CHANNEL', {
      STATUS: 'failed',
      ERROR: 'missing_required_args',
      LOG: 'logs/setup.log',
    });
    process.exit(4);
  }

  if (!isValidGroupFolder(parsed.folder)) {
    emitStatus('REGISTER_CHANNEL', {
      STATUS: 'failed',
      ERROR: 'invalid_folder',
      LOG: 'logs/setup.log',
    });
    process.exit(4);
  }

  logger.info(parsed, 'Registering channel');

  // Ensure data and store directories exist (store/ may not exist on
  // fresh installs that skip WhatsApp auth, which normally creates it)
  fs.mkdirSync(path.join(projectRoot, 'data'), { recursive: true });
  fs.mkdirSync(STORE_DIR, { recursive: true });

  // Initialize database (creates schema + runs migrations)
  initDatabase();

  setRegisteredGroup(parsed.jid, {
    name: parsed.name,
    folder: parsed.folder,
    trigger: parsed.trigger,
    added_at: new Date().toISOString(),
    requiresTrigger: parsed.requiresTrigger,
    isMain: parsed.isMain,
  });

  logger.info('Wrote registration to SQLite');

  // Create group folders
  fs.mkdirSync(path.join(projectRoot, 'groups', parsed.folder, 'logs'), {
    recursive: true,
  });

  const globalDir = path.join(projectRoot, 'groups', 'global');
  const groupDir = path.join(projectRoot, 'groups', parsed.folder);
  fs.mkdirSync(globalDir, { recursive: true });
  fs.mkdirSync(groupDir, { recursive: true });

  seedAgentsFile(
    path.join(globalDir, 'AGENTS.md'),
    path.join(globalDir, 'CLAUDE.md'),
    GLOBAL_AGENTS_TEMPLATE,
    parsed.assistantName,
  );
  seedAgentsFile(
    path.join(groupDir, 'AGENTS.md'),
    path.join(groupDir, 'CLAUDE.md'),
    parsed.isMain ? MAIN_GROUP_TEMPLATE : GROUP_TEMPLATE,
    parsed.assistantName,
  );

  // Update assistant name in AGENTS.md files if different from default
  let nameUpdated = false;
  if (parsed.assistantName !== DEFAULT_ASSISTANT_NAME) {
    logger.info(
      { from: 'Andy', to: parsed.assistantName },
      'Updating assistant name',
    );

    const mdFiles = [
      path.join(projectRoot, 'groups', 'global', 'AGENTS.md'),
      path.join(projectRoot, 'groups', parsed.folder, 'AGENTS.md'),
      path.join(projectRoot, 'groups', 'global', 'CLAUDE.md'),
      path.join(projectRoot, 'groups', parsed.folder, 'CLAUDE.md'),
    ];

    for (const mdFile of mdFiles) {
      if (fs.existsSync(mdFile)) {
        let content = fs.readFileSync(mdFile, 'utf-8');
        content = applyAssistantName(content, parsed.assistantName);
        fs.writeFileSync(mdFile, content);
        logger.info({ file: mdFile }, 'Updated instructions file');
      }
    }

    // Update .env
    const envFile = path.join(projectRoot, '.env');
    if (fs.existsSync(envFile)) {
      let envContent = fs.readFileSync(envFile, 'utf-8');
      if (envContent.includes('ASSISTANT_NAME=')) {
        envContent = envContent.replace(
          /^ASSISTANT_NAME=.*$/m,
          `ASSISTANT_NAME="${parsed.assistantName}"`,
        );
      } else {
        envContent += `\nASSISTANT_NAME="${parsed.assistantName}"`;
      }
      fs.writeFileSync(envFile, envContent);
    } else {
      fs.writeFileSync(envFile, `ASSISTANT_NAME="${parsed.assistantName}"\n`);
    }
    logger.info('Set ASSISTANT_NAME in .env');
    nameUpdated = true;
  }

  emitStatus('REGISTER_CHANNEL', {
    JID: parsed.jid,
    NAME: parsed.name,
    FOLDER: parsed.folder,
    CHANNEL: parsed.channel,
    TRIGGER: parsed.trigger,
    REQUIRES_TRIGGER: parsed.requiresTrigger,
    ASSISTANT_NAME: parsed.assistantName,
    NAME_UPDATED: nameUpdated,
    STATUS: 'success',
    LOG: 'logs/setup.log',
  });
}
