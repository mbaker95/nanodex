import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';
import { stdin as input, stdout as output } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const imageName = 'nanodex-agent:latest';
const prepareOnly = process.env.NANODEX_PREPARE_ONLY === '1';
const nativePackages = ['better-sqlite3', 'keytar'];
const channelSetupOptions = {
  '1': {
    name: 'WhatsApp',
    remote: 'whatsapp',
    repo: 'https://github.com/qwibitai/nanoclaw-whatsapp.git',
  },
  '2': {
    name: 'Telegram',
    remote: 'telegram',
    repo: 'https://github.com/qwibitai/nanoclaw-telegram.git',
  },
  '3': {
    name: 'Slack',
    remote: 'slack',
    repo: 'https://github.com/qwibitai/nanoclaw-slack.git',
  },
  '4': {
    name: 'Discord',
    remote: 'discord',
    repo: 'https://github.com/qwibitai/nanoclaw-discord.git',
  },
  '5': {
    name: 'Gmail',
    remote: 'gmail',
    repo: 'https://github.com/qwibitai/nanoclaw-gmail.git',
  },
};

function resolveCommand(command) {
  if (process.platform === 'win32' && command === 'npm') {
    return 'npm.cmd';
  }

  return command;
}

function quoteShellArg(arg) {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/"/g, '\\"')}"`;
}

function run(command, args, options = {}) {
  const resolvedCommand = resolveCommand(command);
  const useShell = process.platform === 'win32' && resolvedCommand.endsWith('.cmd');
  const result = spawnSync(
    useShell
      ? [resolvedCommand, ...args].map(quoteShellArg).join(' ')
      : resolvedCommand,
    useShell ? [] : args,
    {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: useShell,
    ...options,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function commandSucceeds(command, args, options = {}) {
  const resolvedCommand = resolveCommand(command);
  const useShell = process.platform === 'win32' && resolvedCommand.endsWith('.cmd');
  const result = spawnSync(
    useShell
      ? [resolvedCommand, ...args].map(quoteShellArg).join(' ')
      : resolvedCommand,
    useShell ? [] : args,
    {
    cwd: projectRoot,
    stdio: 'ignore',
    shell: useShell,
    ...options,
    },
  );

  return result.status === 0;
}

function ensureEnvFile() {
  const envPath = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');

  if (fs.existsSync(envPath) || !fs.existsSync(envExamplePath)) {
    return;
  }

  fs.copyFileSync(envExamplePath, envPath);
  console.log('Created .env from .env.example');
}

function ensureDependencies() {
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    return;
  }

  console.log('Installing dependencies...');
  run('npm', ['install']);
}

function nativePackagesHealthy() {
  const script = [
    `try {
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      db.exec('SELECT 1');
      db.close();
    } catch (err) {
      console.error('better-sqlite3: ' + err.message);
      process.exit(1);
    }`,
    `try {
      const keytar = require('keytar');
      if (typeof keytar.getPassword !== 'function') {
        throw new Error('getPassword is not available');
      }
    } catch (err) {
      console.error('keytar: ' + err.message);
      process.exit(1);
    }`,
  ].join('\n');

  return commandSucceeds(process.execPath, ['-e', script]);
}

function ensureNativeDependencies() {
  if (nativePackagesHealthy()) {
    return;
  }

  console.log('Repairing native dependencies...');
  run('npm', ['rebuild', ...nativePackages]);

  if (nativePackagesHealthy()) {
    return;
  }

  console.log('Reinstalling dependencies to restore native modules...');
  run('npm', ['install']);

  if (!nativePackagesHealthy()) {
    console.error(
      [
        'NanoDex could not load its native Node dependencies.',
        'Tried rebuilding and reinstalling `better-sqlite3` and `keytar`.',
        'Check your local Node.js toolchain, then run `npm start` again.',
      ].join('\n'),
    );
    process.exit(1);
  }
}

function buildApp() {
  console.log('Building NanoDex...');
  run('npm', ['run', 'build']);
}

function detectInstalledChannels() {
  const script = [
    "await import('./dist/channels/index.js');",
    "const { getRegisteredChannelNames } = await import('./dist/channels/registry.js');",
    'console.log(JSON.stringify(getRegisteredChannelNames()));',
  ].join('\n');

  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    {
      cwd: projectRoot,
      encoding: 'utf-8',
    },
  );

  if (result.status !== 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout.trim());
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function printChannelSetupInstructions(option) {
  console.log('');
  console.log(`NanoDex core is ready, but the ${option.name} channel is not installed yet.`);
  console.log('Run these commands to add it, then start NanoDex again:');
  console.log('');
  console.log(`git remote add ${option.remote} ${option.repo}`);
  console.log(`git fetch ${option.remote} main`);
  console.log(`git merge ${option.remote}/main`);
  console.log('npm start');
  console.log('');
}

async function runFirstRunWizard() {
  console.log('');
  console.log('NanoDex core is installed, but this repo does not include a messaging channel yet.');
  console.log('Original NanoClaw/NanoDex setup expected the setup agent to add a channel branch first.');
  console.log('');
  console.log('What do you want to set up?');
  console.log('1. WhatsApp');
  console.log('2. Telegram');
  console.log('3. Slack');
  console.log('4. Discord');
  console.log('5. Gmail');
  console.log('6. Exit');
  console.log('');

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printChannelSetupInstructions(channelSetupOptions['1']);
    return;
  }

  const rl = readline.createInterface({ input, output });

  try {
    const answer = (await rl.question('Choose a channel [1-6]: ')).trim();

    if (answer === '6' || answer === '') {
      console.log('No channel selected.');
      return;
    }

    const option = channelSetupOptions[answer];
    if (!option) {
      console.log('Unknown choice.');
      return;
    }

    printChannelSetupInstructions(option);
  } finally {
    rl.close();
  }
}

function buildDockerImage() {
  if (!commandSucceeds('docker', ['info'])) {
    console.error(
      [
        'Docker is required to run NanoDex.',
        'Start Docker Desktop or the Docker daemon, then run `npm start` again.',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log('Building NanoDex Docker image...');
  run('docker', ['build', '-t', imageName, '.'], {
    cwd: path.join(projectRoot, 'container'),
  });
}

function startApp() {
  console.log('Starting NanoDex...');
  run(process.execPath, [path.join(projectRoot, 'dist', 'index.js')]);
}

async function main() {
  ensureEnvFile();
  ensureDependencies();
  ensureNativeDependencies();
  buildApp();

  const installedChannels = detectInstalledChannels();
  if (installedChannels?.length === 0) {
    await runFirstRunWizard();
    process.exit(1);
  }

  buildDockerImage();

  if (prepareOnly) {
    console.log('NanoDex is prepared.');
    return;
  }

  startApp();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
