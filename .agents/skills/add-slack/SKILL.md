---
name: add-slack
description: Add Slack as a channel. Can replace WhatsApp entirely or run alongside it. Uses Socket Mode and does not require a public webhook endpoint.
---

# Add Slack Channel

Use this skill when the user wants Slack as a primary or additional channel.

The expected experience is simple:
1. install the Slack channel code into the user's fork
2. collect or create the Slack app tokens
3. register the main Slack channel
4. verify NanoDex can respond

Do the work yourself. Only stop when the user must create the Slack app, paste tokens, choose a channel, or perform a Slack-side action.

## User Experience Rules

- Do not ask the user to understand remotes, branches, or code layout.
- Do not tell the user to invoke another skill manually.
- Prefer one clear question at a time in normal conversation. Do not use `AskUserQuestion`.
- If the user does not already have a Slack app, guide them through creating one plainly.
- On Windows or PowerShell hosts, prefer cross-platform commands or direct file edits over bash-only snippets.

## Phase 1: Pre-flight

1. Check whether `src/channels/slack.ts` already exists.
2. Check whether `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` are already configured.
3. If code is missing, install it in Phase 2.
4. If code exists but tokens are missing, skip to Phase 3.
5. If tokens exist but registration is missing, skip to Phase 4.

## Phase 2: Install the Channel Code

Install the Slack channel into the fork. Prefer doing the git work directly:

1. Ensure a `slack` remote exists:
   - `https://github.com/qwibitai/nanoclaw-slack.git`
2. Fetch that remote.
3. Merge the relevant branch into the current fork.
4. Resolve conflicts yourself if needed.

The expected code changes include:
- `src/channels/slack.ts`
- `src/channels/slack.test.ts`
- the Slack import added to `src/channels/index.ts`
- required npm dependencies
- `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` in `.env.example`

After merging:
1. run `npm install`
2. run `npm run build`
3. run the Slack channel tests if present

Do not continue until the build is clean.

## Phase 3: Configure Slack Auth

Ask the user whether they already have a Slack app with:
- a Bot Token (`xoxb-...`)
- an App Token for Socket Mode (`xapp-...`)

If not, guide them through creating one at `api.slack.com/apps`.

The essentials:
1. create a Slack app
2. enable Socket Mode and generate an App Token
3. subscribe the bot to message events it needs
4. add the required OAuth scopes
5. install the app to the workspace
6. paste both tokens back into the session

Once the tokens are available:
1. write them to `.env`
2. sync the runtime env if needed

## Phase 4: Register the Main Channel

Ask where the user wants to talk to NanoDex:
- a main Slack channel
- a direct message channel with the bot
- an additional trigger-based channel

Then ask for or help discover the Slack channel ID.

Register the chosen channel with `npx tsx setup/index.ts --step register ...`

Use a sensible default folder name such as `slack_main` for the main channel.

## Phase 5: Verify

After registration:
1. run `npm run build` if code or env changed
2. restart the NanoDex service/runtime if needed
3. tell the user the exact first message to send

Example verification guidance:
- main channel: “Send any message in the registered Slack channel”
- additional channel: “Send `@Assistant hello`”

If verification fails, inspect logs and fix the issue before falling back to a troubleshooting list.

## Troubleshooting Priorities

If Slack does not respond, check these in order:
1. the Slack channel code is installed
2. both Slack tokens are present where NanoDex reads env
3. the Slack channel is registered
4. the service/runtime is running
5. Socket Mode is enabled and the bot has the right scopes

If Slack connects but sees no messages, check event subscriptions, scopes, and whether the bot was actually added to the target channel.

## Completion

Finish by telling the user:
- which Slack channel was registered
- whether it is the main chat
- what trigger to use
- whether a restart was needed
- the exact first message to send for a live test
