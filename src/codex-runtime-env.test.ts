import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockExistsSync,
  mockReadFileSync,
  mockReadEnvFile,
  mockGetPassword,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReadEnvFile: vi.fn(() => ({})),
  mockGetPassword: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    realpathSync: {
      native: (value: string) => value,
    },
  },
}));

vi.mock('keytar', () => ({
  default: {
    getPassword: (...args: unknown[]) => mockGetPassword(...args),
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

  it('prefers login auth when auth.json exists', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{"id":"host-auth"}');

    const runtimeEnv = await loadCodexRuntimeEnv();

    expect(runtimeEnv.authMode).toBe('login');
    expect(runtimeEnv.authSource).toBe('file');
    expect(runtimeEnv.authFilePath).toMatch(/auth\.json$/);
    expect(runtimeEnv.authJson).toContain('"id":"host-auth"');
  });

  it('uses host keyring auth when auth.json is missing', async () => {
    mockExistsSync.mockReturnValue(false);
    mockGetPassword.mockResolvedValue('{"id":"keyring-auth"}');

    const runtimeEnv = await loadCodexRuntimeEnv();

    expect(runtimeEnv.authMode).toBe('login');
    expect(runtimeEnv.authSource).toBe('keyring');
    expect(runtimeEnv.authJson).toContain('"id":"keyring-auth"');
  });

  it('uses existing session auth before falling back to api key', async () => {
    mockExistsSync.mockImplementation((filePath: string) =>
      filePath.endsWith('session-auth.json'),
    );
    mockReadFileSync.mockImplementation((filePath: string) =>
      filePath.endsWith('session-auth.json') ? '{"id":"session-auth"}' : '',
    );
    mockGetPassword.mockResolvedValue(null);

    const runtimeEnv = await loadCodexRuntimeEnv('/tmp/session-auth.json');

    expect(runtimeEnv.authMode).toBe('login');
    expect(runtimeEnv.authSource).toBe('session');
    expect(runtimeEnv.authJson).toContain('"id":"session-auth"');
  });

  it('falls back to api key auth when login auth is unavailable', async () => {
    mockExistsSync.mockReturnValue(false);
    mockGetPassword.mockResolvedValue(null);
    process.env.OPENAI_API_KEY = 'sk-test';

    const runtimeEnv = await loadCodexRuntimeEnv();

    expect(runtimeEnv.authMode).toBe('api_key');
    expect(runtimeEnv.apiKey).toBe('sk-test');
  });

  it('throws when neither login auth nor api key is available', async () => {
    mockExistsSync.mockReturnValue(false);
    mockGetPassword.mockResolvedValue(null);

    await expect(loadCodexRuntimeEnv()).rejects.toThrow(
      /Missing Codex login auth .* no CODEX_API_KEY\/OPENAI_API_KEY fallback/i,
    );
  });
});
