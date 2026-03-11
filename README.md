<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="NanoDex" width="400">
</p>

<p align="center">
  NanoDex is a personal Codex assistant that runs each group in its own Docker container with isolated files, sessions, and tools.
</p>

## What Changed

NanoDex is a Codex-native fork of NanoClaw.

- Claude SDK and Claude auth flows are replaced with the Codex TypeScript SDK and Codex CLI.
- Docker stays in place for isolation.
- Per-group memory now uses `AGENTS.md`.
- Repo-local Codex skills live in `.agents/skills`.
- Built-in Codex slash commands replace several old custom command flows.

## Quick Start

```bash
git clone https://github.com/<your-username>/nanodex.git
cd nanodex
cp .env.example .env
```

Set one of these in `.env`:

```bash
OPENAI_API_KEY=your_key_here
# or
CODEX_API_KEY=your_key_here
```

Optional:

```bash
OPENAI_BASE_URL=https://your-endpoint.example.com
CODEX_MODEL=gpt-5.3-codex
```

Then install dependencies and build:

```bash
npm install --ignore-scripts
./container/build.sh
npm run build
```

Use Codex in this repo to finish setup. Repo skills are available under `.agents/skills`, so you can invoke `$setup` or just ask Codex to set up NanoDex end to end.

## Command Porting

These old NanoClaw command flows map cleanly to native Codex slash commands:

- `/compact`
- `/review`
- `/clear`
- `/plan`
- `/agent`
- `/skills`

These remain repo skills in this fork:

- `$setup`
- `$customize`
- `$debug`
- `$update-nanodex`
- `$update-skills`

`/add-compact` is no longer needed because Codex already ships `/compact`.

## Architecture

```text
Channels -> SQLite -> Host orchestrator -> Docker container -> Codex thread -> Response
```

Each registered group gets:

- its own writable workspace
- its own `.codex` session store
- its own IPC namespace
- shared global instructions via `groups/global/AGENTS.md`

The container-side runtime uses:

- `@openai/codex-sdk`
- `@openai/codex`
- a built-in MCP server for `send_message`, task scheduling, and group registration

## Multi-Agent Support

NanoDex enables Codex collaboration features and the native collab tool surface where the Codex CLI supports them:

- `spawn_agent`
- `send_input`
- `wait`
- `resume_agent`
- `close_agent`

This is a best-effort port of NanoClaw's agent-swarm story. Codex supports native multi-agent workflows, but not through the same public TypeScript API surface Claude exposed.

## Files to Know

- `src/index.ts`
- `src/container-runner.ts`
- `container/agent-runner/src/index.ts`
- `container/agent-runner/src/ipc-mcp-stdio.ts`
- `groups/global/AGENTS.md`
- `groups/main/AGENTS.md`
- `.agents/skills/`

## Requirements

- Node.js 20+
- Docker
- An OpenAI/Codex API key

## Notes

- Host config paths still use `~/.config/nanoclaw` for compatibility with existing installs.
- Legacy `CLAUDE.md` and `.claude` files can coexist during migration, but NanoDex prefers `AGENTS.md` and `.agents`.
