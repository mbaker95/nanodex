# NanoDex Security Model

## Trust Model

| Entity | Trust Level | Rationale |
|--------|-------------|-----------|
| Main group | Trusted | Private self-chat with admin permissions |
| Non-main groups | Untrusted | Other users may be malicious or compromised |
| Container agents | Sandboxed | Docker/Apple Container boundary plus Codex sandbox settings |
| Incoming messages | Untrusted input | Potential prompt injection or exfiltration attempts |

## Security Boundaries

### 1. Container Isolation

Agents execute in a container per active group. The host only exposes explicit mounts and controls lifecycle from outside the sandbox.

- Process isolation between host and agent runtime
- Filesystem isolation to mounted paths only
- Non-root execution where supported
- Ephemeral container instances with persistent per-group session storage only

### 2. Mount Security

Mount permissions are controlled by `~/.config/nanoclaw/mount-allowlist.json` for compatibility with existing installs.

- The allowlist lives outside the project root
- It is never mounted into containers
- Symlinks are resolved before validation
- Dangerous paths and secret-looking filenames are blocked by default
- Non-main groups can be forced into read-only mounts via `nonMainReadOnly`

The project root remains read-only for the main group at `/workspace/project`. Writable paths are split out into dedicated mounts for the group workspace, IPC, and per-group Codex session state.

### 3. Session Isolation

Each group receives its own Codex home at `data/sessions/{group}/.codex/`.

- Groups do not share thread history
- Session transcripts and thread metadata remain scoped to one group
- Global instructions are shared through `groups/global/AGENTS.md`
- Group-local instructions live in `groups/{group}/AGENTS.md`

### 4. IPC Authorization

The in-container MCP bridge validates operations against the group identity that launched the container.

| Operation | Main Group | Non-Main Group |
|-----------|------------|----------------|
| Send message to own chat | Yes | Yes |
| Send message to other chats | Yes | No |
| Schedule task for self | Yes | Yes |
| Schedule task for others | Yes | No |
| View all tasks | Yes | Own only |
| Manage other groups | Yes | No |

### 5. Credential Exposure

NanoDex prefers login-based Codex auth and syncs resolved login state into the per-group Codex home when possible. API-key auth remains a fallback.

Current implications:

- When login auth is available, NanoDex writes the resolved auth payload into the group's mounted `.codex/auth.json`
- When login auth is unavailable, `CODEX_API_KEY` or `OPENAI_API_KEY` is present in the container environment
- `.env` is still shadowed from the read-only project mount when possible
- Real credentials are not written into AGENTS files, IPC files, or group folders by the runtime

This is simpler than the NanoClaw model, but weaker than the previous proxy-based secret isolation. If you need stronger guarantees, run NanoDex on a dedicated host or add a server-side credential broker later.

## Privilege Comparison

| Capability | Main Group | Non-Main Group |
|------------|------------|----------------|
| Project root access | `/workspace/project` (ro) | None |
| Group workspace | `/workspace/context/group` (rw) | `/workspace/context/group` (rw) |
| Global instructions | `/workspace/context/AGENTS.md` (rw from main) | `/workspace/context/AGENTS.md` (ro) |
| Additional mounts | Configurable | Read-only unless explicitly allowed |
| Network access | Enabled | Enabled |
| MCP tools | Full set | Scoped by group authorization |

## Practical Notes

- Docker remains the primary isolation boundary in this fork.
- Codex collaboration is enabled, but spawned agents still inherit the same container boundary as the parent thread.
- Main-group write access to shared instructions is powerful and should be treated as administrator-only.
