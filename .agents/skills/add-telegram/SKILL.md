---
name: add-telegram
description: Add Telegram as a channel. Can replace WhatsApp entirely or run alongside it. Also configurable as a control-only channel or passive channel.
---

# Add Telegram Channel

Use this skill when the user wants Telegram as a primary or additional channel.

The expected experience is simple:
1. install the Telegram channel code into the user's fork
2. collect or create the bot token
3. register the main Telegram chat
4. verify NanoDex can respond

Do the work yourself. Only stop when the user must create a bot, paste a token, choose a chat, or perform a Telegram-side action such as disabling privacy mode.

## User Experience Rules

- Do not ask the user to understand remotes, branches, or code layout.
- Do not tell the user to invoke another skill manually.
- Prefer one clear question at a time in normal conversation. Do not use `AskUserQuestion`.
- If the user does not already have a bot token, walk them through `@BotFather` plainly and wait for the token.
- On Windows or PowerShell hosts, prefer cross-platform commands or direct file edits over bash-only snippets.

## Phase 1: Pre-flight

1. Check whether `src/channels/telegram.ts` already exists.
2. Check whether `TELEGRAM_BOT_TOKEN` is already configured.
3. If code is missing, install it in Phase 2.
4. If code exists but token is missing, skip to Phase 3.
5. If token exists but registration is missing, skip to Phase 4.

## Phase 2: Install the Channel Code

Install the Telegram channel into the fork. Prefer doing the git work directly:

1. Ensure a `telegram` remote exists:
   - `https://github.com/qwibitai/nanoclaw-telegram.git`
2. Fetch that remote.
3. Merge the relevant branch into the current fork.
4. Resolve conflicts yourself if needed.

The expected code changes include:
- `src/channels/telegram.ts`
- `src/channels/telegram.test.ts`
- the Telegram import added to `src/channels/index.ts`
- required npm dependencies
- `TELEGRAM_BOT_TOKEN` in `.env.example`

After merging:
1. run `npm install`
2. run `npm run build`
3. run the Telegram channel tests if present

Do not continue until the build is clean.

## Phase 3: Configure Telegram Auth

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

For group chats, tell the user they may need to disable privacy mode in `@BotFather` so the bot can see normal messages, not only commands and mentions.

## Phase 4: Register the Main Chat

Ask where the user wants to talk to NanoDex:
- direct message with the bot
- existing Telegram group
- control-only or passive use if that is what they asked for

Then ask for or help discover the chat ID.

Use `npx tsx setup/index.ts --step register ...` to register:
- a main chat when Telegram is their main channel
- an additional trigger-based chat otherwise

Choose a sensible default folder name such as `telegram_main` for the main chat.

## Phase 5: Verify

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
