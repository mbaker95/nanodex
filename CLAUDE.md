# NanoDex

Legacy compatibility note for older assistants that still look for `CLAUDE.md`.

Use [AGENTS.md](AGENTS.md) as the canonical repo instructions and [README.md](README.md) for public setup and usage. The live runtime is Codex-native, and repo-local skills live under `.agents/skills`.

## Quick Context

Single Node.js orchestrator with a Docker-backed Codex runtime. Channels self-register at startup. Each group gets its own container session, isolated workspace, IPC namespace, and Codex thread state.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Host orchestrator: polling, routing, scheduler, agent invocation |
| `src/container-runner.ts` | Docker mounts, auth/env injection, container lifecycle |
| `container/agent-runner/src/index.ts` | Container-side Codex thread loop |
| `container/agent-runner/src/ipc-mcp-stdio.ts` | Built-in MCP tools for messaging, tasks, and group control |
| `src/ipc.ts` | Host-side IPC watcher and task mutation |
| `src/db.ts` | SQLite persistence for messages, groups, sessions, and tasks |
| `groups/*/AGENTS.md` | Per-group memory and behavior instructions |
| `.agents/skills/*` | Repo-local Codex skills |

## Skills

| Skill | Purpose |
|-------|---------|
| `$setup` | First-time install and runtime setup |
| `$customize` | Add channels, integrations, or behavior changes |
| `$debug` | Diagnose Docker, auth, IPC, or session issues |
| `$update-nanodex` | Pull upstream fork updates into a customized install |
| `$update-skills` | Refresh repo skill content and skill remotes |

## Development

```bash
npm run dev
npm run build
npm run typecheck
./container/build.sh
```

## Notes

- The runtime is Codex-native, but host config paths still use `~/.config/nanoclaw` for compatibility with existing installs.
- Legacy `.claude` content may still exist in forks, but the runtime prefers `AGENTS.md` and `.agents`.
