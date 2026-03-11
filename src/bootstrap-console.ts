import { spawn } from 'child_process';

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
    'NanoDex is running in bootstrap mode because setup is incomplete.',
    '',
    'You are operating directly on the NanoDex host repository from an interactive Codex CLI session.',
    'For setup and installation work, do that work outside the Codex sandbox on the host system and host repository.',
    'This is about Codex sandbox boundaries, not Docker: use host-side commands, host Windows environment variables, and direct repo edits when dependencies, auth, or channel setup need to change.',
    'Bootstrap mode is for finishing local setup, not for doing a general repo audit.',
    'Treat .env, groups/, store/, data/, logs/, and runtime registration/auth state as the primary setup surface. Treat tracked source or docs changes as a last resort unless you find a real setup bug.',
    'If a bundled channel already exists in src/channels, assume installation is not the task. Focus on credentials, authentication, registration, restart, and live verification.',
    'Do not spend time reading large parts of the codebase unless a concrete setup step fails and you need the source to fix it.',
    'If the user explicitly chooses Telegram, Slack, or Discord, stop steering back to WhatsApp and finish the chosen channel cleanly.',
    "Do not blur the public repo with the user's private setup state. Prefer local env, local registration, and local auth changes before proposing tracked code changes.",
    "NanoDex is meant to stay small, understandable, and easy to reshape in the user's fork.",
    "Keep NanoDex as faithful as possible to NanoClaw's philosophy and user experience while adapting that experience to Codex-native workflows.",
    'Use the repo skills and the local workspace to finish setup directly in the codebase.',
    'Prefer doing the work yourself instead of handing the user command lists or building ad-hoc setup wizards.',
    'Assume the user does not know which channels are bundled or already configured.',
    'Treat WhatsApp as the canonical default NanoClaw-style path. Other bundled channels are secondary and should only become the primary path when the user explicitly prefers them.',
    'If setup is incomplete, begin with the $setup skill immediately instead of waiting for the user to name it.',
    'If no channels are configured yet, say that plainly and recommend WhatsApp as the default first channel unless the user asks for something else.',
    'Ask only for information you truly need from the user.',
    'If a restart is required, say so clearly.',
    '',
    `Assistant name: ${context.assistantName}`,
    `Installed channel modules: ${installedChannels}`,
    `Connected channels: ${connectedChannels}`,
    `Registered groups: ${context.registeredGroupCount}`,
    '',
    'Start by checking the repo state, then help the user choose and configure the first channel from inside this session.',
  ].join('\n');
}

function resolveCodexCommand(): string {
  return process.platform === 'win32' ? 'codex.cmd' : 'codex';
}

function resolveCodexSpawn(
  args: string[],
): { command: string; args: string[]; shell: boolean } {
  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', resolveCodexCommand(), ...args],
      shell: false,
    };
  }

  return {
    command: resolveCodexCommand(),
    args,
    shell: false,
  };
}

export async function runBootstrapConsole(
  context: BootstrapContext,
): Promise<void> {
  const runtimeEnv = await loadCodexRuntimeEnv();
  const args = [
    '--no-alt-screen',
    '--search',
    '-C',
    process.cwd(),
    '-s',
    'workspace-write',
    '-a',
    'on-request',
  ];

  if (runtimeEnv.model) {
    args.push('-m', runtimeEnv.model);
  }

  args.push(buildBootstrapPrompt(context));

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CODEX_DISABLE_TELEMETRY: '1',
  };

  if (runtimeEnv.authMode === 'api_key' && runtimeEnv.apiKey) {
    env.CODEX_API_KEY = runtimeEnv.apiKey;
    env.OPENAI_API_KEY = runtimeEnv.apiKey;
  }

  if (runtimeEnv.baseUrl) {
    env.OPENAI_BASE_URL = runtimeEnv.baseUrl;
  }

  console.log('');
  console.log('NanoDex bootstrap mode');
  console.log('Launching Codex in this terminal to complete setup.');
  console.log('');

  const launch = resolveCodexSpawn(args);

  const child = spawn(launch.command, launch.args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: launch.shell,
  });

  await new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`Codex bootstrap exited with code ${code ?? 'unknown'}`),
      );
    });
  });
}
