import { readEnvFile } from './env.js';

export interface CodexRuntimeEnv {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export function loadCodexRuntimeEnv(): CodexRuntimeEnv {
  const env = readEnvFile([
    'CODEX_API_KEY',
    'OPENAI_API_KEY',
    'OPENAI_BASE_URL',
    'CODEX_MODEL',
    'OPENAI_MODEL',
  ]);

  const apiKey =
    process.env.CODEX_API_KEY ||
    process.env.OPENAI_API_KEY ||
    env.CODEX_API_KEY ||
    env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing CODEX_API_KEY or OPENAI_API_KEY in the environment or .env',
    );
  }

  const baseUrl = process.env.OPENAI_BASE_URL || env.OPENAI_BASE_URL;
  const model =
    process.env.CODEX_MODEL ||
    process.env.OPENAI_MODEL ||
    env.CODEX_MODEL ||
    env.OPENAI_MODEL;

  return {
    apiKey,
    baseUrl: baseUrl || undefined,
    model: model || undefined,
  };
}
