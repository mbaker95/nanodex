---
name: add-telegram
description: Add Telegram as a channel. Can replace WhatsApp entirely or run alongside it. Also configurable as a control-only channel or passive channel.
---

# Add Telegram Channel

Use this skill when the user wants Telegram as a primary or additional channel.

Telegram is bundled in NanoDex core. The expected experience is:
1. collect or create the bot token
2. register the main Telegram chat
3. verify NanoDex can respond

Do the work yourself. Only stop when the user must create a bot, paste a token, choose a chat, or perform a Telegram-side action such as disabling privacy mode.

## User Experience Rules

- Do not ask the user to understand remotes, branches, or code layout.
- Do not tell the user to invoke another skill manually.
- Prefer one clear question at a time in normal conversation. Do not use `AskUserQuestion`.
- If the user does not already have a bot token, walk them through `@BotFather` plainly and wait for the token.
- On Windows or PowerShell hosts, prefer cross-platform commands or direct file edits over bash-only snippets.
- Telegram is bundled. Treat this as a local setup and registration task unless you find a real Telegram runtime bug.
- Do not perform a broad code review before doing the obvious setup work.
- Prefer local/private state changes first: `.env`, host env, bot verification, chat registration, restart, and live response testing.
- If the user picked Telegram, stay on Telegram. Do not redirect the conversation back toward WhatsApp unless the user changes their mind.

## Phase 1: Pre-flight

1. Confirm the bundled Telegram file exists: `src/channels/telegram.ts`.
2. Check whether `TELEGRAM_BOT_TOKEN` is already configured.
3. If token exists but registration is missing, skip to Phase 3.
4. Keep file inspection minimal. Once the bundle exists and the env path is known, move on to actual setup.

## Phase 2: Configure Telegram Auth

Ask the user whether they already have a Telegram bot token.

If not, guide them through `@BotFather`:
1. search for `@BotFather`
2. run `/newbot`
3. choose a display name
4. choose a username ending in `bot`
5. paste the token back into the session

Once the token is available:
1. write it to `.env`
2. sync the runtime env if needed
3. explain Telegram privacy mode for group chats
4. verify the token with a live Telegram API call before moving on

For group chats, tell the user they may need to disable privacy mode in `@BotFather` so the bot can see normal messages, not only commands and mentions.

## Phase 3: Register the Main Chat

Ask where the user wants to talk to NanoDex:
- direct message with the bot
- existing Telegram group
- control-only or passive use if that is what they asked for

Then ask for or help discover the chat ID.

Use `npx tsx setup/index.ts --step register ...` to register:
- a main chat when Telegram is their main channel
- an additional trigger-based chat otherwise

Choose a sensible default folder name such as `telegram_main` for the main chat.

## Phase 4: Verify

After registration:
1. run `npm run build` if code or env changed
2. restart the NanoDex service/runtime if needed
3. tell the user the exact first message to send

Example verification guidance:
- main chat: “Send any message to the bot”
- additional chat: “Send `@Assistant hello`” or mention the bot if required

If verification fails, inspect logs and fix the issue before falling back to a troubleshooting list.

## Troubleshooting Priorities

If Telegram does not respond, check these in order:
1. the Telegram channel code is installed
2. `TELEGRAM_BOT_TOKEN` is present where NanoDex reads env
3. the chat is registered
4. the service/runtime is running
5. Telegram privacy mode matches the intended behavior

If the bot only responds to commands or mentions in a group, explain and fix privacy mode before changing anything else.

## Completion

Finish by telling the user:
- which Telegram chat was registered
- whether it is the main chat
- what trigger to use
- whether privacy mode matters for that chat
- the exact first message to send for a live test
