---
name: add-whatsapp
description: Add WhatsApp as a channel. Can replace other channels entirely or run alongside them. Uses QR code or pairing code for authentication.
---

# Add WhatsApp Channel

Use this skill when the user wants WhatsApp, or when first-run setup needs a recommended default channel.

WhatsApp is bundled in NanoDex core. The expected experience is:
1. authenticate WhatsApp
2. register the main chat
3. verify NanoDex can respond

Do the work yourself. Only stop when the user must scan a QR code, enter a pairing code, choose between real options, or confirm a phone/chat choice.

## User Experience Rules

- Do not ask the user to understand channel remotes, branch merges, or file locations.
- Do not tell the user to invoke another skill manually.
- Prefer one clear question at a time in normal conversation. Do not use `AskUserQuestion`.
- If the user does not know what channel to pick, WhatsApp is the recommended default.
- On Windows or PowerShell hosts, avoid bash-only commands when there is a cross-platform alternative.

## Phase 1: Pre-flight

1. Confirm the bundled WhatsApp files exist:
   - `src/channels/whatsapp.ts`
   - `src/whatsapp-auth.ts`
   - `setup/whatsapp-auth.ts`
2. Check whether WhatsApp auth already exists by looking for `store/auth/creds.json`.
3. If auth exists but registration is missing, skip to Phase 3.

## Phase 2: Authenticate WhatsApp

If authentication is needed, ask the user which method they want:
- QR code in browser
- QR code in terminal
- pairing code

Recommended default:
- desktop environment: QR code in browser
- headless or awkward remote terminal: pairing code

If the user chooses pairing code, ask for their phone number with country code and no `+`.

Use the setup step added by the WhatsApp channel:
- `npx tsx setup/index.ts --step whatsapp-auth -- --method ...`

If re-authenticating, clear the old auth directory first.

Only pause for the user actions that must happen on their phone:
- scan QR
- enter pairing code

When auth finishes, verify `store/auth/creds.json` exists.

## Phase 3: Register the Main Chat

Once auth exists, guide the user through choosing where NanoDex should live:
- self-chat
- solo group
- existing group
- DM with a dedicated assistant number

Recommended default:
- shared/personal number: self-chat
- dedicated assistant number: direct message with the bot

Ask for:
1. shared number vs dedicated assistant number
2. trigger word if they want something other than the default
3. assistant display name if they want something other than the default
4. chat choice

Then determine the correct JID:
- self-chat from auth credentials
- group JIDs from the `groups` setup step
- DM JID from the chosen number

Register the chat with `npx tsx setup/index.ts --step register ...`

For the main chat:
- mark it as main
- disable trigger requirement when appropriate

## Phase 4: Verify

After registration:
1. run `npm run build` if code or env changed
2. sync `.env` to `data/env/env` when needed
3. restart the NanoDex service/runtime if needed
4. tell the user the exact first test message to send

Example verification guidance:
- main/self-chat: “Send any message”
- group: “Send `@Assistant hello`”

If verification fails, inspect logs and fix the issue rather than giving the user a troubleshooting list immediately.

## Troubleshooting Priorities

If WhatsApp does not respond, check these in order:
1. auth credentials exist
2. channel code is installed
3. the chat is registered
4. the service/runtime is running
5. the trigger requirement matches the chosen chat type

If the issue is a stale auth session, clear auth and re-run authentication.
If the issue is a duplicate process conflict, stop the extra process and retry.

## Completion

Finish by telling the user:
- which chat was registered
- whether it is the main chat
- what trigger to use
- whether a restart was needed
- the exact first message to send for a live test
