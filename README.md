<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="NanoDex" width="400">
</p>

<h1 align="center">NanoDex</h1>

<p align="center">
  A self-hosted Codex assistant with isolated Docker runtimes, per-group memory, and a codebase small enough to reshape safely in your own fork.
</p>

## Overview

NanoDex is a Codex-native fork of NanoClaw. It is built for people who want a personal assistant they can run themselves, understand end to end, and reshape in their own fork without turning everything into one shared chat thread.

Each group runs with its own workspace, session state, instructions, and tools. Shared behavior lives in `AGENTS.md` and `.agents/skills`, while the host orchestrator stays small: routing, persistence, scheduling, and container lifecycle.

## Why NanoDex

- Small enough to understand and safe to modify
- True isolation through per-group Docker workspaces
- Built for a personal fork, not a generic framework
- Codex-native setup, debugging, and customization
- Shared and per-group memory through `AGENTS.md`
- Repo-local skills that add capabilities without bloating core

## Quick Start

```bash
git clone https://github.com/<your-username>/nanodex.git
cd nanodex
npm start
```

That is the standard way to start NanoDex. On first launch, NanoDex prepares the local environment, hands setup to Codex in your terminal, and restarts itself automatically when setup changes the repo or runtime state.

## Philosophy

**Small enough to understand.** NanoDex should stay small enough that one person can understand the whole system and safely let Codex modify it.

**Secure by isolation.** Agents should only see what is explicitly mounted. Isolation matters more than application-layer permission theater.

**Built for your fork.** NanoDex is not meant to become a generic framework. The point is to shape your own copy until it fits your exact workflow.

**Code over config.** Prefer changing the code over introducing more configuration surfaces. A small codebase is easier to reason about than a large matrix of settings.

**AI-native.** Setup, debugging, and customization should happen through Codex, not through hand-built wizards, dashboards, or sprawling control panels.

**Skills over features.** New capabilities should land as skills that transform a fork, not as more default behavior in core.

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

NanoDex uses native Codex concepts rather than recreating Claude-specific behavior on top. The intended interface is still the agent itself: ask Codex to inspect the repo, install a channel, debug a failure, or reshape the fork directly.

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
