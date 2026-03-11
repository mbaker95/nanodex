---
name: setup
description: Set up NanoDex for first use. Use when the user wants dependencies installed, the Docker image built, Codex auth configured, a main group registered, or the background service started.
---

# NanoDex Setup

Run setup end to end. Only pause when the user must authenticate a messaging channel or choose between mutually exclusive options.

## Goals

1. Ensure the repo is on the user's fork.
2. Install project dependencies.
3. Ensure Docker is installed and running.
4. Build the `nanodex-agent:latest` image with `./container/build.sh`.
5. Ensure `.env` contains `OPENAI_API_KEY` or `CODEX_API_KEY`.
6. Register the user's main group if it is not already registered.
7. Start or restart the background service.

## Notes

- Use `npx tsx setup/index.ts --step environment` to inspect runtime state.
- Use `npx tsx setup/index.ts --step container` to rebuild/test the image.
- Use `npx tsx setup/index.ts --step register -- ...` to register groups.
- Prefer fixing missing dependencies yourself instead of telling the user to do it.
- Prefer the user's local Codex login when available. Fall back to `OPENAI_API_KEY` or `CODEX_API_KEY` only when needed.
- If the repo is still pointing at upstream only, help the user create or attach their own GitHub fork before finishing.
