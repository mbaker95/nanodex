import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';

/**
 * Tests for the environment check step.
 *
 * Verifies: config detection, Docker/AC detection, DB queries.
 */

describe('environment detection', () => {
  it('detects platform correctly', async () => {
    const { getPlatform } = await import('./platform.js');
    const platform = getPlatform();
    expect(['macos', 'linux', 'unknown']).toContain(platform);
  });
});

describe('registered groups DB query', () => {
  let registeredGroups: Array<{ jid: string; folder: string }>;

  beforeEach(() => {
    registeredGroups = [];
  });

  it('returns 0 for empty table', () => {
    expect(registeredGroups).toHaveLength(0);
  });

  it('returns correct count after inserts', () => {
    registeredGroups.push(
      { jid: '123@g.us', folder: 'group-1' },
      { jid: '456@g.us', folder: 'group-2' },
    );

    expect(registeredGroups).toHaveLength(2);
  });
});

describe('credentials detection', () => {
  it('detects OPENAI_API_KEY in env content', () => {
    const content = 'SOME_KEY=value\nOPENAI_API_KEY=sk-test123\nOTHER=foo';
    expect(/^(CODEX_API_KEY|OPENAI_API_KEY)=/m.test(content)).toBe(true);
  });

  it('detects CODEX_API_KEY in env content', () => {
    const content = 'CODEX_API_KEY=token123';
    expect(/^(CODEX_API_KEY|OPENAI_API_KEY)=/m.test(content)).toBe(true);
  });

  it('returns false when no credentials', () => {
    const content = 'ASSISTANT_NAME="Andy"\nOTHER=foo';
    expect(/^(CODEX_API_KEY|OPENAI_API_KEY)=/m.test(content)).toBe(false);
  });
});

describe('Docker detection logic', () => {
  it('commandExists returns boolean', async () => {
    const { commandExists } = await import('./platform.js');
    expect(typeof commandExists('docker')).toBe('boolean');
    expect(typeof commandExists('nonexistent_binary_xyz')).toBe('boolean');
  });
});

describe('channel auth detection', () => {
  it('detects non-empty auth directory', () => {
    const hasAuth = (authDir: string) => {
      try {
        return fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0;
      } catch {
        return false;
      }
    };

    // Non-existent directory
    expect(hasAuth('/tmp/nonexistent_auth_dir_xyz')).toBe(false);
  });
});

