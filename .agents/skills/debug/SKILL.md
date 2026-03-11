---
name: debug
description: Debug NanoDex container/runtime issues including Docker, Codex auth, session persistence, and IPC.
---

# NanoDex Debugging

Focus on the Docker-backed Codex runtime.

## Checkpoints

1. Host build and typecheck:
   - `npm run build`
   - `./container/build.sh`
2. Container image exists and starts:
   - `echo '{}' | docker run -i --entrypoint /bin/echo nanodex-agent:latest OK`
3. Auth env exists:
   - `.env` should contain `OPENAI_API_KEY=` or `CODEX_API_KEY=`
4. Session mount exists:
   - `data/sessions/<group>/.codex/`
   - mounted to `/home/node/.codex`
5. Logs:
   - host logs in `logs/`
   - per-container logs in `groups/<folder>/logs/container-*.log`

## Common Problems

- Missing OpenAI/Codex API key.
- Docker not running.
- Old `nanoclaw-agent` image still being referenced in `.env` or local overrides instead of `nanodex-agent`.
- Session path mismatch preventing Codex thread reuse.
- MCP tool failures from `container/agent-runner/src/ipc-mcp-stdio.ts`.
