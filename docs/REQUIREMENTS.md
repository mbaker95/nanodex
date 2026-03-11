# NanoDex Requirements

Current product requirements and philosophy for the Codex-native fork.

---

## Why This Exists

NanoDex exists to keep a personal AI assistant understandable, isolated, and easy to reshape.

The project should not turn into a control plane, plugin framework, or maze of configuration. It should stay close to one person's real use case while leaving the code small enough that Codex can safely inspect it, modify it, and explain it end to end.

---

## Philosophy

### Small Enough to Understand

The core should remain compact enough that one person can understand the host runtime, container runtime, storage, and channel flow without needing a platform team.

### Security Through Real Isolation

Agents run inside containers with explicit mounts. Security should come from real boundaries and narrow mounts, not from app-layer permission theater.

### Built for a Personal Fork

NanoDex is not trying to be a generic automation platform. The intended use is: fork it, shape it, and let Codex help keep that fork coherent over time.

### Code Over Configuration

Simple, low-risk knobs can live in `.env`, but behavioral changes should usually be expressed as code or instructions, not layered configuration systems.

### Agent-First Operation

Setup, debugging, and customization should happen through Codex in the repo, not through dashboards or shell-side setup wizards. The assistant should be the primary interface.

### Skills Over Feature Sprawl

Core messaging paths can be bundled when they are central to first-run usability. Everything else should prefer repo skills that transform the fork directly instead of inflating the core runtime.

### Faithful to NanoClaw

NanoDex should stay as close as possible to NanoClaw's philosophy and user experience while adapting that experience to Codex-native tools and workflows. The underlying agent stack can change. The character of the project should not.

### WhatsApp as the Default Shape

The most faithful NanoClaw interpretation treats WhatsApp as the default product path. Other channels may be available, but they should remain secondary to that default shape in setup flow and product framing.

---

## Product Shape

NanoDex is a personal Codex assistant with:

- a small Node.js host orchestrator
- per-group Docker isolation
- per-group memory via `groups/*/AGENTS.md`
- shared memory via `groups/global/AGENTS.md`
- scheduled tasks
- repo-local skills under `.agents/skills`

Default communication path:

- WhatsApp

Secondary bundled channels:

- Telegram
- Slack
- Discord

Other integrations should generally arrive as skills or deliberate fork changes.

---

## Runtime Requirements

### Host Runtime

- Receive messages from configured channels
- Store messages, groups, sessions, and tasks in SQLite
- Route each registered group to its own isolated container session
- Keep the host process understandable and auditable

### Group Isolation

Each group should get:

- its own writable workspace
- its own Codex thread/session state
- its own IPC namespace
- its own instruction file at `groups/<group>/AGENTS.md`

The main/admin group may also inspect the host project through a read-only mount.

### Memory Model

- Shared/global memory lives in `groups/global/AGENTS.md`
- Per-group memory lives in `groups/<group>/AGENTS.md`
- Durable group-specific notes should live in that group's workspace
- Legacy `CLAUDE.md` files may be read for compatibility, but AGENTS-first behavior is the target

### Scheduling

- Users can ask NanoDex to schedule recurring or one-off work
- Scheduled tasks execute in the same group-scoped container model
- Main-group users can manage all tasks; non-main groups are scoped to their own work

---

## Setup Requirements

The intended first-run experience is:

1. User runs `npm start`
2. NanoDex prepares local dependencies and runtime prerequisites
3. If setup is incomplete, Codex takes over in the terminal
4. Codex configures a bundled channel, authenticates it, registers the main group, and restarts NanoDex when needed

The user should not need to understand:

- git remotes for channels
- branch merge mechanics
- hidden service wiring
- separate shell-side setup menus

---

## Naming and Behavior

- Default assistant name remains configurable through `ASSISTANT_NAME`
- Trigger behavior can vary by channel, but the assistant identity should stay coherent
- Outbound behavior should stay concise and chat-friendly

---

## Non-Goals

NanoDex should not become:

- a multi-tenant hosted platform
- a plugin marketplace in the runtime core
- a giant integration catalog by default
- a dashboard-heavy agent product

If a change pushes the repo in that direction, it is probably the wrong change unless it clearly improves the personal fork model without growing complexity in the core.
