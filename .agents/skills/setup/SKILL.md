---
name: setup
description: Set up NanoDex for first use. Use when the user wants dependencies installed, the Docker image built, Codex auth configured, a main group registered, or the background service started.
---

# NanoDex Setup

Run setup end to end from inside Codex. Treat this as the primary first-run experience. Only pause when the user must authenticate a messaging channel, choose between mutually exclusive options, or provide a secret/token that cannot be discovered locally.

## Goals

1. Ensure the repo is on the user's fork.
2. Install project dependencies.
3. Ensure Docker is installed and running.
4. Build the `nanodex-agent:latest` image with `./container/build.sh`.
5. Ensure Codex authentication works, preferring the user's local Codex login and falling back to `OPENAI_API_KEY` or `CODEX_API_KEY` only when needed.
6. Install and configure the user's first channel directly in the repo when it is missing.
7. Register the user's main group if it is not already registered.
8. Start or restart the background service.

## User Experience Rules

- The user should not need to know what NanoDex bundles by default.
- If no channel modules are installed, say that plainly and offer to install one now.
- Recommend WhatsApp first unless the user explicitly prefers Telegram, Slack, Discord, or another channel.
- Do not tell the user to invoke repo skills manually. Use the relevant skill yourself.
- Do not explain branch/remotes/merge mechanics unless something fails and the user needs context.
- Prefer one clear question at a time in normal conversation. Do not use `AskUserQuestion` or Claude-specific UI concepts.

## Flow

1. Check repo/fork state.
2. Repair dependencies and native modules if needed.
3. Verify Codex auth.
4. Ensure Docker is running and the container image builds.
5. Determine whether any channels are already installed and connected.
6. If no channel is installed, recommend WhatsApp and then invoke the matching channel skill yourself.
7. If a channel is installed but not configured, finish its auth/registration instead of talking abstractly about setup.
8. Once a main group exists, verify the service/runtime and tell the user the next concrete message to send.

## Notes

- Use `npx tsx setup/index.ts --step environment` to inspect runtime state.
- Use `npx tsx setup/index.ts --step container` to rebuild/test the image.
- Use `npx tsx setup/index.ts --step register -- ...` to register groups.
- Prefer fixing missing dependencies yourself instead of handing the user command lists.
- Prefer the user's local Codex login when available. Fall back to `OPENAI_API_KEY` or `CODEX_API_KEY` only when needed.
- If the repo is still pointing at upstream only, help the user create or attach their own GitHub fork before finishing.
- Do not turn setup into a shell wizard. The point of NanoDex is that the agent performs setup and reshapes the fork directly.
- On Windows or PowerShell hosts, prefer cross-platform commands or direct file edits over bash-only snippets.
- If setup completes but the running process must be restarted to load new code, say that explicitly and stop there.
