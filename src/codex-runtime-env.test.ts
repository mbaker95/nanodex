import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExistsSync, mockReadEnvFile } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadEnvFile: vi.fn(() => ({})),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
  },
}));

vi.mock('./env.js', () => ({
  readEnvFile: mockReadEnvFile,
}));

import { loadCodexRuntimeEnv } from './codex-runtime-env.js';

describe('loadCodexRuntimeEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CODEX_AUTH_MODE;
    delete process.env.CODEX_AUTH_FILE;
    delete process.env.CODEX_HOME;
    delete process.env.CODEX_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.CODEX_MODEL;
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers login auth when auth.json exists', () => {
    mockExistsSync.mockReturnValue(true);

    const runtimeEnv = loadCodexRuntimeEnv();

    expect(runtimeEnv.authMode).toBe('login');
    expect(runtimeEnv.authFilePath).toMatch(/auth\.json$/);
  });

  it('falls back to api key auth when login auth is missing', () => {
    mockExistsSync.mockReturnValue(false);
    process.env.OPENAI_API_KEY = 'sk-test';

    const runtimeEnv = loadCodexRuntimeEnv();

    expect(runtimeEnv.authMode).toBe('api_key');
    expect(runtimeEnv.apiKey).toBe('sk-test');
  });

  it('throws when neither login auth nor api key is available', () => {
    mockExistsSync.mockReturnValue(false);

    expect(() => loadCodexRuntimeEnv()).toThrow(
      /Missing Codex login auth .* no CODEX_API_KEY\/OPENAI_API_KEY fallback/i,
    );
  });
});
