<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="NanoDex" width="400">
</p>

<h1 align="center">NanoDex</h1>

<p align="center">
  A personal Codex assistant that runs each group in its own Docker container with isolated memory, tools, and session state.
</p>

## Why NanoDex

NanoDex is for people who want a Codex-powered assistant they can run themselves, customize deeply, and keep organized by group or channel instead of stuffing everything into one global chat.

- Codex-native runtime with ChatGPT login support by default
- Docker isolation for each group workspace and session
- `AGENTS.md` memory per group plus shared global instructions
- repo-local Codex skills in `.agents/skills`
- built-in task scheduling, IPC tools, and group registration
- best-effort support for Codex multi-agent workflows

## Quick Start

```bash
git clone https://github.com/<your-username>/nanodex.git
cd nanodex
npm start
```

That is the normal way to start NanoDex.

On first run, `npm start` will automatically:

1. create `.env` from `.env.example` if it is missing
2. install dependencies if `node_modules` is missing
3. repair native Node modules if your local install is stale or incomplete
4. build the TypeScript app
5. build or refresh the Docker image
6. start NanoDex

You do not need to manually run `cp .env.example .env`.

## Requirements

- Node.js 20+
- Docker running locally
- a Codex login on the host, or an `OPENAI_API_KEY` / `CODEX_API_KEY`

## Authentication

NanoDex prefers your local Codex login by default.

If you have already run `codex` on the host and signed in with ChatGPT, NanoDex will reuse that login automatically. It supports:

- `~/.codex/auth.json`
- Codex credentials stored in the host keyring
- cached per-group session auth inside NanoDex

If login auth is not available, NanoDex falls back to API-key auth.

Example `.env` override:

```bash
OPENAI_API_KEY=your_key_here
# or
CODEX_API_KEY=your_key_here

# optional
OPENAI_BASE_URL=https://your-endpoint.example.com
CODEX_MODEL=gpt-5.3-codex
```

If you are happy with login-based auth, you usually do not need to edit `.env` at all.

## Everyday Commands

Start NanoDex:

```bash
npm start
```

If NanoDex starts but reports that no channels are connected, that means the core runtime is healthy and you just have not configured WhatsApp, Telegram, Slack, or another channel yet.

Prepare everything without launching the long-running service:

PowerShell:

```powershell
$env:NANODEX_PREPARE_ONLY='1'
npm start
```

macOS/Linux:

```bash
NANODEX_PREPARE_ONLY=1 npm start
```

Run in development mode:

```bash
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
npm run test -- src/codex-runtime-env.test.ts src/container-runner.test.ts
```

## What It Does

NanoDex sits between your channels and Codex:

```text
Channels -> SQLite -> Host orchestrator -> Docker container -> Codex thread -> Response
```

Each registered group gets:

- its own writable workspace
- its own `.codex` session state
- its own IPC namespace
- its own `groups/<group>/AGENTS.md`

Shared behavior lives in:

- `groups/global/AGENTS.md`
- `.agents/skills/`

## Codex Experience

NanoDex uses native Codex concepts instead of trying to fake Claude behavior.

Built-in Codex commands you can use directly:

- `/compact`
- `/review`
- `/clear`
- `/plan`
- `/agent`
- `/skills`

Repo skills included in this fork:

- `$setup`
- `$customize`
- `$debug`
- `$update-nanodex`
- `$update-skills`

## Multi-Agent Workflows

NanoDex enables Codex collaboration features where the Codex CLI supports them, including:

- `spawn_agent`
- `send_input`
- `wait`
- `resume_agent`
- `close_agent`

This is a practical Codex-native replacement for the old NanoClaw swarm model. It is not identical to the original Claude teams API surface.

## Project Structure

- `src/index.ts`: host orchestrator
- `src/container-runner.ts`: Docker mounts, auth injection, container lifecycle
- `container/agent-runner/src/index.ts`: container-side Codex thread loop
- `container/agent-runner/src/ipc-mcp-stdio.ts`: built-in MCP tools for messaging, tasks, and group control
- `src/db.ts`: SQLite persistence
- `groups/*/AGENTS.md`: per-group memory and behavior
- `.agents/skills/*`: repo-local Codex skills

## Development

```bash
npm run dev
npm run build
npm run typecheck
```

Container-specific work:

```bash
cd container
docker build -t nanodex-agent:latest .
docker run -i --rm --entrypoint /bin/echo nanodex-agent:latest "Container OK"
```

## Notes

- NanoDex is a Codex-native fork of NanoClaw.
- Host config paths still use `~/.config/nanoclaw` for compatibility with existing installs.
- Legacy `CLAUDE.md` and `.claude` content may still exist in forks, but NanoDex prefers `AGENTS.md` and `.agents`.

