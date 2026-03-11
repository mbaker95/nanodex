import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { readEnvFile } from './env.js';

export type CodexAuthMode = 'login' | 'api_key';
export type CodexAuthSource = 'file' | 'keyring' | 'session';

export interface CodexRuntimeEnv {
  authMode: CodexAuthMode;
  authSource?: CodexAuthSource;
  authJson?: string;
  apiKey?: string;
  authFilePath?: string;
  baseUrl?: string;
  model?: string;
}

function resolveHostCodexHome(env: Record<string, string>): string {
  return process.env.CODEX_HOME || env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

function resolveAuthFilePath(env: Record<string, string>, hostCodexHome: string): string {
  return process.env.CODEX_AUTH_FILE || env.CODEX_AUTH_FILE || path.join(hostCodexHome, 'auth.json');
}

function readJsonFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  JSON.parse(raw);
  return raw;
}

function computeKeyringStoreKey(codexHome: string): string {
  let canonicalPath = codexHome;
  try {
    canonicalPath = fs.realpathSync.native(codexHome);
  } catch {
    canonicalPath = path.resolve(codexHome);
  }

  const digest = createHash('sha256').update(canonicalPath).digest('hex');
  return `cli|${digest.slice(0, 16)}`;
}

async function readAuthJsonFromKeyring(codexHome: string): Promise<string | null> {
  try {
    const keytar = await import('keytar');
    const serialized = await keytar.default.getPassword(
      'Codex Auth',
      computeKeyringStoreKey(codexHome),
    );
    if (!serialized) return null;

    JSON.parse(serialized);
    return serialized;
  } catch {
    return null;
  }
}

export async function loadCodexRuntimeEnv(
  existingSessionAuthPath?: string,
): Promise<CodexRuntimeEnv> {
  const env = readEnvFile([
    'CODEX_AUTH_MODE',
    'CODEX_AUTH_FILE',
    'CODEX_HOME',
    'CODEX_API_KEY',
    'OPENAI_API_KEY',
    'OPENAI_BASE_URL',
    'CODEX_MODEL',
    'OPENAI_MODEL',
  ]);

  const requestedAuthMode =
    (process.env.CODEX_AUTH_MODE || env.CODEX_AUTH_MODE || 'login').toLowerCase();

  if (!['login', 'api_key'].includes(requestedAuthMode)) {
    throw new Error(
      `Unsupported CODEX_AUTH_MODE "${requestedAuthMode}". Use "login" or "api_key".`,
    );
  }

  const hostCodexHome = resolveHostCodexHome(env);
  const authFilePath = resolveAuthFilePath(env, hostCodexHome);

  const apiKey =
    process.env.CODEX_API_KEY ||
    process.env.OPENAI_API_KEY ||
    env.CODEX_API_KEY ||
    env.OPENAI_API_KEY;

  const baseUrl = process.env.OPENAI_BASE_URL || env.OPENAI_BASE_URL;
  const model =
    process.env.CODEX_MODEL ||
    process.env.OPENAI_MODEL ||
    env.CODEX_MODEL ||
    env.OPENAI_MODEL;

  if (requestedAuthMode === 'login') {
    const hostAuthJson = readJsonFile(authFilePath);
    if (hostAuthJson) {
      return {
        authMode: 'login',
        authSource: 'file',
        authJson: hostAuthJson,
        authFilePath,
        model: model || undefined,
      };
    }

    const keyringAuthJson = await readAuthJsonFromKeyring(hostCodexHome);
    if (keyringAuthJson) {
      return {
        authMode: 'login',
        authSource: 'keyring',
        authJson: keyringAuthJson,
        model: model || undefined,
      };
    }

    if (existingSessionAuthPath) {
      const sessionAuthJson = readJsonFile(existingSessionAuthPath);
      if (sessionAuthJson) {
        return {
          authMode: 'login',
          authSource: 'session',
          authJson: sessionAuthJson,
          model: model || undefined,
        };
      }
    }

    if (apiKey) {
      return {
        authMode: 'api_key',
        apiKey,
        baseUrl: baseUrl || undefined,
        model: model || undefined,
      };
    }

    throw new Error(
      `Missing Codex login auth in ${authFilePath}, the host keyring, and the group session, with no CODEX_API_KEY/OPENAI_API_KEY fallback configured.`,
    );
  }

  if (!apiKey) {
    throw new Error(
      'Missing CODEX_API_KEY or OPENAI_API_KEY in the environment or .env',
    );
  }

  return {
    authMode: 'api_key',
    apiKey,
    baseUrl: baseUrl || undefined,
    model: model || undefined,
  };
}
