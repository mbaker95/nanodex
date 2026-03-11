---
name: setup
description: Set up NanoDex for first use. Use when the user wants dependencies installed, the Docker image built, Codex auth configured, a main group registered, or the background service started.
---

# NanoDex Setup

Run setup end to end from inside Codex. Treat this as the primary first-run experience. Only pause when the user must authenticate a messaging channel, choose between mutually exclusive options, or provide a secret/token that cannot be discovered locally.

Keep the setup experience as faithful as possible to NanoClaw while adapting it to Codex-native tools and workflows.

## Goals

1. Ensure the repo is on the user's fork.
2. Install project dependencies.
3. Ensure Docker is installed and running.
4. Build the `nanodex-agent:latest` image with `./container/build.sh`.
5. Ensure Codex authentication works, preferring the user's local Codex login and falling back to `OPENAI_API_KEY` or `CODEX_API_KEY` only when needed.
6. Configure the user's first channel, with WhatsApp as the canonical default.
7. Register the user's main group if it is not already registered.
8. Start or restart the background service.

## User Experience Rules

- The user should not need to know what NanoDex bundles by default.
- If no channel is configured yet, say that plainly and offer to configure one now.
- Recommend WhatsApp first as the canonical NanoClaw-style path unless the user explicitly prefers Telegram, Slack, Discord, or another channel.
- Do not tell the user to invoke repo skills manually. Use the relevant skill yourself.
- Do not explain branch/remotes/merge mechanics unless something fails and the user needs context.
- If a choice would make NanoDex feel less like NanoClaw in setup flow or operating model, treat that as the wrong direction unless there is a strong reason.
- Prefer one clear question at a time in normal conversation. Do not use `AskUserQuestion` or Claude-specific UI concepts.

## Flow

1. Check repo/fork state.
2. Repair dependencies and native modules if needed.
3. Verify Codex auth.
4. Ensure Docker is running and the container image builds.
5. Determine whether WhatsApp or any secondary bundled channels are already configured and connected.
6. If no channel is configured, recommend WhatsApp and then invoke the matching channel skill yourself.
7. If a secondary bundled channel is preferred or already partially configured, finish its auth/registration instead of talking abstractly about setup.
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
- When bootstrap changes the repo or runtime state, the outer `npm start` flow will rebuild and restart automatically. Tell the user that is happening when relevant.
