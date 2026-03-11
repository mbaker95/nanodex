<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="NanoDex" width="400">
</p>

<h1 align="center">NanoDex</h1>

<p align="center">
  A self-hosted Codex assistant with per-group memory, isolated Docker runtimes, and repo-local skills.
</p>

## Overview

NanoDex is a Codex-native fork of NanoClaw. It is built for people who want a personal assistant they can run themselves, organize by group or channel, and extend without turning everything into one shared chat thread.

Each group runs with its own workspace, session state, instructions, and tools. Shared behavior lives in `AGENTS.md` and `.agents/skills`, while the host orchestrator manages routing, persistence, scheduling, and container lifecycle.

## Highlights

- Codex-native runtime with local login support by default
- Per-group Docker isolation for workspaces and sessions
- Shared and per-group memory through `AGENTS.md`
- Repo-local skills in `.agents/skills`
- Built-in scheduling, IPC tools, and group registration
- Support for Codex multi-agent workflows where the Codex runtime supports them

## Quick Start

```bash
git clone https://github.com/<your-username>/nanodex.git
cd nanodex
npm start
```

That is the standard way to start NanoDex.

On first launch, NanoDex will prepare the local environment, build what it needs, and guide you through any remaining setup required to get the assistant running.

## Requirements

- Node.js 20 or newer
- Docker running locally
- a local Codex login, or an `OPENAI_API_KEY` / `CODEX_API_KEY`

## Authentication

NanoDex prefers your existing Codex login on the host machine.

If you have already signed in with the Codex CLI, NanoDex will try to reuse that session automatically. Supported sources include:

- `~/.codex/auth.json`
- Codex credentials stored in the host keyring
- cached per-group session auth created by NanoDex

If login-based auth is unavailable, NanoDex falls back to API-key auth.

Example `.env` values:

```bash
OPENAI_API_KEY=your_key_here
# or
CODEX_API_KEY=your_key_here

# optional
OPENAI_BASE_URL=https://your-endpoint.example.com
CODEX_MODEL=gpt-5.3-codex
```

If you are using your local Codex login, you usually do not need to edit `.env` beyond project-specific overrides.

## Common Commands

Start NanoDex:

```bash
npm start
```

Prepare the project without starting the long-running runtime:

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

## How It Works

NanoDex sits between your channels and Codex:

```text
Channels -> SQLite -> Host orchestrator -> Docker container -> Codex thread -> Response
```

Each registered group gets:

- its own writable workspace
- its own `.codex` session state
- its own IPC namespace
- its own `groups/<group>/AGENTS.md`

Shared instructions and reusable workflows live in:

- `groups/global/AGENTS.md`
- `.agents/skills/`

## Codex Experience

NanoDex uses native Codex concepts rather than recreating Claude-specific behavior on top.

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

NanoDex enables Codex collaboration features where available, including:

- `spawn_agent`
- `send_input`
- `wait`
- `resume_agent`
- `close_agent`

This is a practical Codex-native replacement for the old NanoClaw swarm model, though it is not a one-to-one port of Claude's previous teams surface.

## Project Structure

- `src/index.ts`: host orchestrator
- `src/container-runner.ts`: Docker mounts, auth injection, and container lifecycle
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

Container-specific checks:

```bash
cd container
docker build -t nanodex-agent:latest .
docker run -i --rm --entrypoint /bin/echo nanodex-agent:latest "Container OK"
```

## Notes

- NanoDex is a Codex-native fork of NanoClaw.
- Host config paths still use `~/.config/nanoclaw` for compatibility with existing installs.
- Legacy `CLAUDE.md` and `.claude` content may still exist in forks, but NanoDex prefers `AGENTS.md` and `.agents`.
