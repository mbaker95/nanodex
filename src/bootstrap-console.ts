import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

import { Codex, type Thread, type ThreadOptions } from '@openai/codex-sdk';

import { DATA_DIR } from './config.js';
import { loadCodexRuntimeEnv } from './codex-runtime-env.js';

export interface BootstrapContext {
  installedChannels: string[];
  connectedChannels: string[];
  registeredGroupCount: number;
  assistantName: string;
}

function buildBootstrapPrompt(context: BootstrapContext): string {
  const installedChannels =
    context.installedChannels.length > 0
      ? context.installedChannels.join(', ')
      : 'none';
  const connectedChannels =
    context.connectedChannels.length > 0
      ? context.connectedChannels.join(', ')
      : 'none';

  return [
    'NanoDex started in bootstrap mode because it is not configured enough to run normally yet.',
    '',
    'You are the NanoDex bootstrap assistant running on the host machine in the project root.',
    'Help the user set up NanoDex from this terminal.',
    'You can inspect and modify the repo, run shell commands, install channel code, update env files, and run setup scripts.',
    'Prefer doing the work yourself over giving the user command lists.',
    'Ask one short question at a time when you need user input.',
    'If you finish a step that requires NanoDex to restart, say so clearly.',
    '',
    `Assistant name: ${context.assistantName}`,
    `Installed channel modules: ${installedChannels}`,
    `Connected channels: ${connectedChannels}`,
    `Registered groups: ${context.registeredGroupCount}`,
    '',
    'Start by introducing yourself briefly and asking which channel the user wants to set up first.',
  ].join('\n');
}

function prepareBootstrapCodexHome(authJson: string): string {
  const codexHome = path.join(DATA_DIR, 'bootstrap', '.codex');
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(path.join(codexHome, 'auth.json'), authJson);
  return codexHome;
}

function createCodexClient(apiKey?: string, baseUrl?: string): Codex {
  return new Codex({
    ...(apiKey ? { apiKey } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    config: {
      features: {
        collab: true,
        collaboration_modes: true,
        multi_agent: true,
      },
    },
  });
}

function getThreadOptions(model?: string): ThreadOptions {
  return {
    model: model || undefined,
    workingDirectory: process.cwd(),
    skipGitRepoCheck: true,
    sandboxMode: 'workspace-write',
    approvalPolicy: 'never',
    networkAccessEnabled: true,
    webSearchMode: 'live',
  };
}

async function runTurn(thread: Thread, prompt: string): Promise<void> {
  const { events } = await thread.runStreamed(prompt);

  for await (const event of events) {
    if (event.type === 'item.completed') {
      if (event.item.type === 'agent_message' && event.item.text.trim()) {
        console.log('');
        console.log(event.item.text.trim());
        console.log('');
      }

      if (event.item.type === 'error') {
        throw new Error(event.item.message);
      }
    } else if (event.type === 'turn.failed') {
      throw new Error(event.error.message);
    } else if (event.type === 'error') {
      throw new Error(event.message);
    }
  }
}

export async function runBootstrapConsole(
  context: BootstrapContext,
): Promise<void> {
  const runtimeEnv = await loadCodexRuntimeEnv();

  if (runtimeEnv.authMode === 'login' && runtimeEnv.authJson) {
    process.env.CODEX_HOME = prepareBootstrapCodexHome(runtimeEnv.authJson);
  }

  if (runtimeEnv.model) {
    process.env.CODEX_MODEL = runtimeEnv.model;
    process.env.OPENAI_MODEL = runtimeEnv.model;
  }

  if (runtimeEnv.baseUrl) {
    process.env.OPENAI_BASE_URL = runtimeEnv.baseUrl;
  }

  process.env.CODEX_DISABLE_TELEMETRY = '1';

  const codex = createCodexClient(runtimeEnv.apiKey, runtimeEnv.baseUrl);
  const thread = codex.startThread(getThreadOptions(runtimeEnv.model));

  console.log('');
  console.log('NanoDex bootstrap mode');
  console.log('Codex is running in this terminal to help you finish setup.');
  console.log("Type `exit` when you're done and rerun `npm start`.");
  console.log('');

  await runTurn(thread, buildBootstrapPrompt(context));

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const answer = (await rl.question('you> ')).trim();

      if (!answer) {
        continue;
      }

      if (['exit', 'quit'].includes(answer.toLowerCase())) {
        console.log('');
        console.log('Bootstrap session ended. Run `npm start` again to launch NanoDex.');
        console.log('');
        return;
      }

      await runTurn(thread, answer);
    }
  } finally {
    rl.close();
  }
}
