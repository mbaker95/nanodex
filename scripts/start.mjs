import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const imageName = 'nanodex-agent:latest';
const prepareOnly = process.env.NANODEX_PREPARE_ONLY === '1';
const nativePackages = ['better-sqlite3', 'keytar'];

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

function main() {
  ensureEnvFile();
  ensureDependencies();
  ensureNativeDependencies();
  buildApp();

  if (prepareOnly) {
    buildDockerImage();
    console.log('NanoDex is prepared.');
    return;
  }

  startApp();
}

main();
