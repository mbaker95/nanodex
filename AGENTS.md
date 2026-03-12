# NanoDex

Personal Codex assistant. See [README.md](README.md) for setup and usage.
The canonical philosophy lives in [PHILOSOPHY.md](PHILOSOPHY.md).

## Quick Context

Single Node.js orchestrator with a Docker-backed Codex runtime. Channels self-register at startup. Each group gets its own container session, isolated workspace, IPC namespace, and Codex thread state.

## Philosophy

- Keep the core small enough that one person can understand the whole thing.
- Prefer real isolation over application-layer permission theater.
- Keep NanoDex coherent as a small, direct, self-hosted Codex assistant runtime.
- Treat WhatsApp as the canonical default product path; other bundled channels are secondary.
- Treat this repo as a personal fork to reshape, not a generic framework to configure.
- Prefer code changes over configuration sprawl.
- Let Codex do setup, debugging, and customization directly instead of building wrapper UIs or shell wizards.
- Prefer skills that transform a fork over adding more default behavior to core.

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

Use Codex repo skills from `.agents/skills`.

| Skill | Purpose |
|-------|---------|
| `$setup` | First-time install and runtime setup |
| `$customize` | Add channels, integrations, or behavior changes |
| `$debug` | Diagnose Docker, auth, IPC, or session issues |
| `$update-nanodex` | Pull upstream fork updates into a customized install |
| `$update-skills` | Refresh repo skill content and skill remotes |

Built-in Codex slash commands replace several old Claude-specific flows:
- `/compact`
- `/review`
- `/clear`
- `/plan`
- `/agent`
- `/skills`

## Development

```bash
npm run dev
npm run build
npm run typecheck
./container/build.sh
```

Service management:

```bash
# macOS (launchd)
launchctl load ~/Library/LaunchAgents/com.nanodex.plist
launchctl unload ~/Library/LaunchAgents/com.nanodex.plist
launchctl kickstart -k gui/$(id -u)/com.nanodex

# Linux (systemd)
systemctl --user start nanodex
systemctl --user stop nanodex
systemctl --user restart nanodex
```

## Notes

- The runtime is Codex-native, but host config paths still use `~/.config/nanoclaw` for compatibility with existing installs.
- Legacy `CLAUDE.md` and `.claude` content may still exist in forks; the runtime prefers `AGENTS.md` and `.agents`.
- If setup behavior starts drifting into shell-side onboarding, pull it back into the Codex runtime. The agent should stay the primary interface.
