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
    "NanoDex is meant to stay small, understandable, and easy to reshape in the user's fork.",
    'Use the repo skills and the local workspace to finish setup directly in the codebase.',
    'Prefer doing the work yourself instead of handing the user command lists or building ad-hoc setup wizards.',
    'Assume the user does not know which channels are bundled by default.',
    'If setup is incomplete, begin with the $setup skill immediately instead of waiting for the user to name it.',
    'If no channels are installed yet, say that plainly and recommend WhatsApp as the default first channel unless the user asks for something else.',
    'Ask only for information you truly need from the user.',
    'If a restart is required, say so clearly.',
    '',
    `Assistant name: ${context.assistantName}`,
    `Installed channel modules: ${installedChannels}`,
    `Connected channels: ${connectedChannels}`,
    `Registered groups: ${context.registeredGroupCount}`,
    '',
    'Start by checking the repo state, then help the user choose and install the first channel from inside this session.',
  ].join('\n');
}

function resolveCodexCommand(): string {
  return process.platform === 'win32' ? 'codex.cmd' : 'codex';
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

  const child = spawn(resolveCodexCommand(), args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
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
