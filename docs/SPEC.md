# NanoDex Specification

## Overview

NanoDex is a Docker-backed personal Codex assistant.

The host process receives messages from installed channels, stores them in SQLite, and routes each registered group to an isolated container. Inside each container, a Codex thread handles the conversation with repo-local instructions, per-group session state, and a built-in MCP server for messaging and scheduling.

## Runtime Model

### Host

- `src/index.ts` polls channels and dispatches work.
- `src/db.ts` stores messages, sessions, groups, tasks, and router state.
- `src/group-queue.ts` serializes work per group and caps global concurrency.
- `src/ipc.ts` processes filesystem IPC written by the container runtime.
- `src/task-scheduler.ts` launches scheduled tasks back through the same container path.

### Container

- `container/agent-runner/src/index.ts` runs the Codex SDK/CLI loop.
- `container/agent-runner/src/ipc-mcp-stdio.ts` exposes built-in MCP tools.
- `container/Dockerfile` builds the image used for every group container.

## Isolation

Each group gets:

- a writable workspace rooted at `/workspace/context/group`
- a per-group Codex session store mounted at `/home/node/.codex`
- a per-group IPC directory mounted at `/workspace/ipc`
- optional additional mounts validated by the host allowlist

The main group also gets a read-only mirror of the project at `/workspace/project`.

## Instructions and Memory

- Shared/global instructions live in `groups/global/AGENTS.md`.
- Per-group instructions live in `groups/<group>/AGENTS.md`.
- Repo skills live in `.agents/skills`.
- Legacy `CLAUDE.md` files may still be present during migration, but NanoDex prefers `AGENTS.md`.

## Auth

NanoDex expects OpenAI/Codex credentials in `.env` or the host environment:

```bash
OPENAI_API_KEY=...
# or
CODEX_API_KEY=...
```

Optional:

```bash
OPENAI_BASE_URL=...
CODEX_MODEL=...
```

Unlike NanoClaw, there is no Anthropic credential proxy in the runtime path.

## MCP Surface

The built-in MCP server is registered as `nanodex` and exposes tools for:

- immediate messaging
- task creation/list/update/pause/resume/cancel
- group registration

These appear to Codex as `mcp__nanodex__*`.

## Multi-Agent

NanoDex enables Codex collaboration feature flags so the runtime can use Codex-native multi-agent tools when supported by the installed CLI:

- `spawn_agent`
- `send_input`
- `wait`
- `resume_agent`
- `close_agent`

This is a best-effort replacement for NanoClaw's Claude-specific team tooling.

## Build and Operations

Host:

```bash
npm run build
npm run typecheck
```

Container:

```bash
./container/build.sh
```

Default image name:

```bash
nanodex-agent:latest
```
