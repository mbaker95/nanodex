# NanoDex Debug Checklist

## Quick Status Check

```bash
# macOS
launchctl list | grep nanodex

# Linux
systemctl --user status nanodex

# Logs
tail -f logs/nanodex.log

# Running containers
docker ps --format '{{.Names}} {{.Status}}' | grep nanodex
```

## Service Issues

```bash
# Restart on macOS
launchctl kickstart -k gui/$(id -u)/com.nanodex

# Restart on Linux
systemctl --user restart nanodex

# Nohup fallback
ps -fp "$(cat nanodex.pid)"
```

If the service does not come back:

- Run `npm run build`
- Re-run the setup service step
- Check `logs/nanodex.error.log`

## Container Issues

```bash
# Build image
cd container && ./build.sh

# Dry-run container
echo '{}' | docker run -i --rm --entrypoint /bin/echo nanodex-agent:latest "Container OK"

# Inspect recent per-group container logs
ls -lt groups/*/logs/container-*.log | head -10
```

Look for:

- `Container timeout`
- `Failed to parse container output`
- mount validation errors
- Codex auth errors caused by missing `CODEX_API_KEY` or `OPENAI_API_KEY`

## Session and Thread Issues

Per-group Codex state lives under `data/sessions/<group>/.codex/`.

Check:

```bash
ls -la data/sessions/<group>/.codex
ls -la data/sessions/<group>/agent-runner-src
```

Symptoms to watch for:

- no session files created after a message
- repeated new threads instead of resumed threads
- stale `current_tasks.json` or IPC input files under `data/ipc/<group>/`

## Message Flow Issues

```bash
grep 'New messages' logs/nanodex.log | tail -10
grep -E 'Processing messages|Spawning container' logs/nanodex.log | tail -10
grep -E 'Piped messages|sendMessage' logs/nanodex.log | tail -10
grep -E 'Starting container|Container active|concurrency limit' logs/nanodex.log | tail -10
```

If messages are received but no reply is sent:

- verify the group is registered
- inspect the latest group container log
- confirm the MCP bridge is writing under `/workspace/ipc`

## Mount Issues

```bash
cat ~/.config/nanoclaw/mount-allowlist.json
sqlite3 store/messages.db "SELECT name, container_config FROM registered_groups;"
grep -E 'Mount validated|Mount.*REJECTED|mount' logs/nanodex.log | tail -10
```

Notes:

- the config path still uses `~/.config/nanoclaw` for compatibility
- non-main groups cannot write to shared instructions or other groups' mounts

## Auth Issues

Check `.env` for one of:

- `CODEX_API_KEY`
- `OPENAI_API_KEY`

If auth is configured but requests still fail:

- confirm `OPENAI_BASE_URL` is correct when using a custom endpoint
- rebuild the container after changing environment variables
- restart the service so the host process reloads configuration
