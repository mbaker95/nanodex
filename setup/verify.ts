/**
 * Step: verify - End-to-end health check of the full installation.
 * Replaces 09-verify.sh
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import Database from 'better-sqlite3';

import { STORE_DIR } from '../src/config.js';
import { readEnvFile } from '../src/env.js';
import { logger } from '../src/logger.js';
import { getServiceManager, isRoot } from './platform.js';
import { emitStatus } from './status.js';

const SERVICE_NAME = 'nanodex';
const SERVICE_LABEL = 'com.nanodex';

export async function run(_args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const homeDir = os.homedir();

  logger.info('Starting verification');

  const service = detectServiceStatus(projectRoot);
  logger.info({ service }, 'Service status');

  const containerRuntime = detectContainerRuntime();
  const credentials = detectCredentials(projectRoot);
  const { configuredChannels, channelAuth } = detectChannelAuth(projectRoot);
  const registeredGroups = countRegisteredGroups();
  const mountAllowlist = fs.existsSync(
    path.join(homeDir, '.config', 'nanoclaw', 'mount-allowlist.json'),
  )
    ? 'configured'
    : 'missing';

  const status =
    service === 'running' &&
    credentials !== 'missing' &&
    configuredChannels.length > 0 &&
    registeredGroups > 0
      ? 'success'
      : 'failed';

  logger.info({ status, channelAuth }, 'Verification complete');

  emitStatus('VERIFY', {
    SERVICE: service,
    CONTAINER_RUNTIME: containerRuntime,
    CREDENTIALS: credentials,
    CONFIGURED_CHANNELS: configuredChannels.join(','),
    CHANNEL_AUTH: JSON.stringify(channelAuth),
    REGISTERED_GROUPS: registeredGroups,
    MOUNT_ALLOWLIST: mountAllowlist,
    STATUS: status,
    LOG: 'logs/setup.log',
  });

  if (status === 'failed') {
    process.exit(1);
  }
}

function detectServiceStatus(projectRoot: string): string {
  const manager = getServiceManager();

  if (manager === 'launchd') {
    return detectLaunchdStatus();
  }

  if (manager === 'systemd') {
    return detectSystemdStatus();
  }

  return detectNohupStatus(projectRoot);
}

function detectLaunchdStatus(): string {
  try {
    const output = execSync('launchctl list', { encoding: 'utf-8' });
    if (!output.includes(SERVICE_LABEL)) {
      return 'not_found';
    }

    const line = output.split('\n').find((entry) => entry.includes(SERVICE_LABEL));
    if (!line) {
      return 'stopped';
    }

    const pidField = line.trim().split(/\s+/)[0];
    return pidField !== '-' && pidField ? 'running' : 'stopped';
  } catch {
    return 'not_found';
  }
}

function detectSystemdStatus(): string {
  const prefix = isRoot() ? 'systemctl' : 'systemctl --user';

  try {
    execSync(`${prefix} is-active ${SERVICE_NAME}`, { stdio: 'ignore' });
    return 'running';
  } catch {
    try {
      const output = execSync(`${prefix} list-unit-files`, {
        encoding: 'utf-8',
      });
      return output.includes(SERVICE_NAME) ? 'stopped' : 'not_found';
    } catch {
      return 'not_found';
    }
  }
}

function detectNohupStatus(projectRoot: string): string {
  const pidFile = path.join(projectRoot, `${SERVICE_NAME}.pid`);
  if (!fs.existsSync(pidFile)) {
    return 'not_found';
  }

  try {
    const raw = fs.readFileSync(pidFile, 'utf-8').trim();
    const pid = Number(raw);
    if (!raw || !Number.isInteger(pid) || pid <= 0) {
      return 'stopped';
    }

    process.kill(pid, 0);
    return 'running';
  } catch {
    return 'stopped';
  }
}

function detectContainerRuntime(): string {
  try {
    execSync('command -v container', { stdio: 'ignore' });
    return 'apple-container';
  } catch {
    try {
      execSync('docker info', { stdio: 'ignore' });
      return 'docker';
    } catch {
      return 'none';
    }
  }
}

function detectCredentials(projectRoot: string): string {
  const hostAuthFile = process.env.CODEX_AUTH_FILE ||
    process.env.CODEX_HOME ||
    path.join(os.homedir(), '.codex');
  const authFilePath = hostAuthFile.endsWith('auth.json')
    ? hostAuthFile
    : path.join(hostAuthFile, 'auth.json');

  if (fs.existsSync(authFilePath)) {
    return 'configured';
  }

  const envFile = path.join(projectRoot, '.env');
  if (!fs.existsSync(envFile)) {
    return 'missing';
  }

  const envContent = fs.readFileSync(envFile, 'utf-8');
  return /^(CODEX_API_KEY|OPENAI_API_KEY)=/m.test(envContent)
    ? 'configured'
    : 'missing';
}

function detectChannelAuth(projectRoot: string): {
  configuredChannels: string[];
  channelAuth: Record<string, string>;
} {
  const envVars = readEnvFile([
    'TELEGRAM_BOT_TOKEN',
    'SLACK_BOT_TOKEN',
    'SLACK_APP_TOKEN',
    'DISCORD_BOT_TOKEN',
  ]);

  const channelAuth: Record<string, string> = {};
  const authDir = path.join(projectRoot, 'store', 'auth');

  if (fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0) {
    channelAuth.whatsapp = 'authenticated';
  }

  if (process.env.TELEGRAM_BOT_TOKEN || envVars.TELEGRAM_BOT_TOKEN) {
    channelAuth.telegram = 'configured';
  }

  if (
    (process.env.SLACK_BOT_TOKEN || envVars.SLACK_BOT_TOKEN) &&
    (process.env.SLACK_APP_TOKEN || envVars.SLACK_APP_TOKEN)
  ) {
    channelAuth.slack = 'configured';
  }

  if (process.env.DISCORD_BOT_TOKEN || envVars.DISCORD_BOT_TOKEN) {
    channelAuth.discord = 'configured';
  }

  return {
    configuredChannels: Object.keys(channelAuth),
    channelAuth,
  };
}

function countRegisteredGroups(): number {
  const dbPath = path.join(STORE_DIR, 'messages.db');
  if (!fs.existsSync(dbPath)) {
    return 0;
  }

  try {
    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare('SELECT COUNT(*) as count FROM registered_groups')
      .get() as { count: number };
    db.close();
    return row.count;
  } catch {
    return 0;
  }
}
