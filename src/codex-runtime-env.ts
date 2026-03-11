import fs from 'fs';
import os from 'os';
import path from 'path';

import { readEnvFile } from './env.js';

export type CodexAuthMode = 'login' | 'api_key';

export interface CodexRuntimeEnv {
  authMode: CodexAuthMode;
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

export function loadCodexRuntimeEnv(): CodexRuntimeEnv {
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
  const hasLoginAuth = fs.existsSync(authFilePath);

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
    if (hasLoginAuth) {
      return {
        authMode: 'login',
        authFilePath,
        model: model || undefined,
      };
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
      `Missing Codex login auth at ${authFilePath} and no CODEX_API_KEY/OPENAI_API_KEY fallback is configured.`,
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
