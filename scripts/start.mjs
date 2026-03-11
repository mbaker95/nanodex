import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { fileURLToPath, pathToFileURL } from 'url';
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

function capture(command, args, options = {}) {
  const resolvedCommand = resolveCommand(command);
  const useShell = process.platform === 'win32' && resolvedCommand.endsWith('.cmd');
  const result = spawnSync(
    useShell
      ? [resolvedCommand, ...args].map(quoteShellArg).join(' ')
      : resolvedCommand,
    useShell ? [] : args,
    {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: useShell,
      ...options,
    },
  );

  if (result.error) {
    throw result.error;
  }

  return result;
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

async function detectInstalledChannels() {
  try {
    const channelsIndexUrl = pathToFileURL(
      path.join(projectRoot, 'dist', 'channels', 'index.js'),
    ).href;
    const registryUrl = pathToFileURL(
      path.join(projectRoot, 'dist', 'channels', 'registry.js'),
    ).href;

    await import(channelsIndexUrl);
    const { getRegisteredChannelNames } = await import(registryUrl);
    const registeredChannelNames = getRegisteredChannelNames();
    return Array.isArray(registeredChannelNames) ? registeredChannelNames : null;
  } catch {
    return null;
  }
}

function printChannelSetupInstructions(option) {
  console.log('');
  console.log(`NanoDex is ready, but the ${option.name} channel is not installed yet.`);
  console.log('Run these commands to add it, then start NanoDex again:');
  console.log('');
  console.log(`git remote add ${option.remote} ${option.repo}`);
  console.log(`git fetch ${option.remote} main`);
  console.log(`git merge ${option.remote}/main`);
  console.log('npm start');
  console.log('');
}

function hasCleanGitWorktree() {
  const result = capture('git', ['status', '--short']);
  if (result.status !== 0) {
    return false;
  }

  return result.stdout.trim() === '';
}

function ensureChannelRemote(option) {
  const remotes = capture('git', ['remote']).stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!remotes.includes(option.remote)) {
    run('git', ['remote', 'add', option.remote, option.repo]);
    return;
  }

  run('git', ['remote', 'set-url', option.remote, option.repo]);
}

function installChannel(option) {
  console.log('');
  console.log(`Installing the ${option.name} channel...`);

  if (!hasCleanGitWorktree()) {
    console.log('');
    console.log(
      'NanoDex will not auto-merge a channel branch into a dirty working tree.',
    );
    console.log(
      'Commit or discard your local changes first, then run `npm start` again.',
    );
    console.log('');
    printChannelSetupInstructions(option);
    process.exit(1);
  }

  try {
    ensureChannelRemote(option);
    run('git', ['fetch', option.remote, 'main']);
    run('git', ['merge', `${option.remote}/main`, '--no-edit']);
    run('npm', ['install']);
    ensureNativeDependencies();
    buildApp();
    console.log(`${option.name} channel installed.`);
  } catch (err) {
    console.log('');
    console.log(`Failed to auto-install the ${option.name} channel.`);
    console.log(err instanceof Error ? err.message : String(err));
    console.log('');
    printChannelSetupInstructions(option);
    process.exit(1);
  }
}

async function runFirstRunWizard() {
  console.log('');
  console.log('NanoDex is installed, but it still needs its first channel.');
  console.log('Pick what you want to connect first. If you are unsure, start with WhatsApp.');
  console.log('');
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
    const answer = (await rl.question('Choose a channel [1-6, Enter for WhatsApp]: ')).trim();

    if (answer === '6') {
      console.log('No channel selected.');
      return;
    }

    const option = channelSetupOptions[answer || '1'];
    if (!option) {
      console.log('Unknown choice.');
      return;
    }

    const installAnswer = (
      await rl.question(`Install ${option.name} automatically now? [Y/n]: `)
    )
      .trim()
      .toLowerCase();

    if (installAnswer === 'n' || installAnswer === 'no') {
      printChannelSetupInstructions(option);
      return;
    }

    installChannel(option);
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

  const installedChannels = await detectInstalledChannels();
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
