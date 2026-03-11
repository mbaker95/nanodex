---
name: add-discord
description: Add Discord bot channel integration to NanoDex.
---

# Add Discord Channel

Use this skill when the user wants Discord as a primary or additional channel.

The expected experience is simple:
1. install the Discord channel code into the user's fork
2. collect or create the Discord bot token
3. register the main Discord channel
4. verify NanoDex can respond

Do the work yourself. Only stop when the user must create the Discord bot, paste a token, choose a channel, or perform a Discord-side action.

## User Experience Rules

- Do not ask the user to understand remotes, branches, or code layout.
- Do not tell the user to invoke another skill manually.
- Prefer one clear question at a time in normal conversation. Do not use `AskUserQuestion`.
- If the user does not already have a Discord bot token, guide them through the Discord Developer Portal plainly.
- On Windows or PowerShell hosts, prefer cross-platform commands or direct file edits over bash-only snippets.

## Phase 1: Pre-flight

1. Check whether `src/channels/discord.ts` already exists.
2. Check whether `DISCORD_BOT_TOKEN` is already configured.
3. If code is missing, install it in Phase 2.
4. If code exists but token is missing, skip to Phase 3.
5. If token exists but registration is missing, skip to Phase 4.

## Phase 2: Install the Channel Code

Install the Discord channel into the fork. Prefer doing the git work directly:

1. Ensure a `discord` remote exists:
   - `https://github.com/qwibitai/nanoclaw-discord.git`
2. Fetch that remote.
3. Merge the relevant branch into the current fork.
4. Resolve conflicts yourself if needed.

The expected code changes include:
- `src/channels/discord.ts`
- `src/channels/discord.test.ts`
- the Discord import added to `src/channels/index.ts`
- required npm dependencies
- `DISCORD_BOT_TOKEN` in `.env.example`

After merging:
1. run `npm install`
2. run `npm run build`
3. run the Discord channel tests if present

Do not continue until the build is clean.

## Phase 3: Configure Discord Auth

Ask the user whether they already have a Discord bot token.

If not, guide them through the Discord Developer Portal:
1. create an application
2. create a bot for it
3. generate or reset the bot token
4. enable Message Content Intent
5. optionally enable member-related intents if needed
6. invite the bot to the target server with the required permissions
7. paste the token back into the session

Once the token is available:
1. write it to `.env`
2. sync the runtime env if needed

## Phase 4: Register the Main Channel

Ask where the user wants to talk to NanoDex:
- a main Discord text channel
- an additional trigger-based channel

Then help the user get the channel ID:
- enable Discord Developer Mode
- right-click the channel
- copy the channel ID

Register the chosen channel with `npx tsx setup/index.ts --step register ...`

Use a sensible default folder name such as `discord_main` for the main channel.

## Phase 5: Verify

After registration:
1. run `npm run build` if code or env changed
2. restart the NanoDex service/runtime if needed
3. tell the user the exact first message to send

Example verification guidance:
- main channel: “Send any message in the registered Discord channel”
- additional channel: “Mention the bot or use the configured trigger”

If verification fails, inspect logs and fix the issue before falling back to a troubleshooting list.

## Troubleshooting Priorities

If Discord does not respond, check these in order:
1. the Discord channel code is installed
2. `DISCORD_BOT_TOKEN` is present where NanoDex reads env
3. the Discord channel is registered
4. the service/runtime is running
5. the Discord bot has Message Content Intent and was invited to the right server/channel

If the bot connects but cannot read messages, fix intents before changing anything else.

## Completion

Finish by telling the user:
- which Discord channel was registered
- whether it is the main chat
- what trigger to use
- whether a restart was needed
- the exact first message to send for a live test
