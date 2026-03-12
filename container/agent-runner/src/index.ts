import fs from 'fs';
import path from 'path';
import { Codex, type Thread, type ThreadOptions } from '@openai/codex-sdk';
import { fileURLToPath } from 'url';

interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  isScheduledTask?: boolean;
  assistantName?: string;
}

interface ContainerOutput {
  status: 'success' | 'error';
  result: string | null;
  newSessionId?: string;
  error?: string;
}

const CONTEXT_ROOT = '/workspace/context';
const GROUP_WORKSPACE = path.join(CONTEXT_ROOT, 'group');
const IPC_INPUT_DIR = '/workspace/ipc/input';
const IPC_INPUT_ACK_DIR = '/workspace/ipc/input-acks';
const IPC_INPUT_CLOSE_SENTINEL = path.join(IPC_INPUT_DIR, '_close');
const IPC_POLL_MS = 500;
const OUTPUT_START_MARKER = '---NANODEX_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANODEX_OUTPUT_END---';

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function writeOutput(output: ContainerOutput): void {
  console.log(OUTPUT_START_MARKER);
  console.log(JSON.stringify(output));
  console.log(OUTPUT_END_MARKER);
}

function log(message: string): void {
  console.error(`[agent-runner] ${message}`);
}

function getStringField(
  value: unknown,
  keys: string[],
): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const field = record[key];
    if (typeof field === 'string' && field.trim()) {
      return field.trim();
    }
  }

  return null;
}

function getItemType(item: unknown): string | null {
  return getStringField(item, ['type']);
}

function getAgentMessageText(item: unknown): string | null {
  return getStringField(item, ['text']);
}

function getItemErrorMessage(item: unknown): string | null {
  return getStringField(item, ['message', 'text']);
}

function describeTool(item: unknown): string | null {
  return getStringField(item, [
    'tool_name',
    'toolName',
    'name',
    'title',
    'command',
  ]);
}

function isToolItemType(itemType: string | null): boolean {
  return !!itemType && (itemType.includes('tool') || itemType.includes('mcp'));
}

function shouldClose(): boolean {
  if (fs.existsSync(IPC_INPUT_CLOSE_SENTINEL)) {
    try {
      fs.unlinkSync(IPC_INPUT_CLOSE_SENTINEL);
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

function acknowledgeIpcMessage(messageId: string): void {
  try {
    fs.mkdirSync(IPC_INPUT_ACK_DIR, { recursive: true });
    fs.writeFileSync(path.join(IPC_INPUT_ACK_DIR, `${messageId}.ack`), '');
  } catch (err) {
    log(
      `Failed to acknowledge IPC message ${messageId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function drainIpcInput(): string[] {
  try {
    fs.mkdirSync(IPC_INPUT_DIR, { recursive: true });
    const files = fs
      .readdirSync(IPC_INPUT_DIR)
      .filter((file) => file.endsWith('.json'))
      .sort();

    const messages: string[] = [];
    for (const file of files) {
      const filePath = path.join(IPC_INPUT_DIR, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        fs.unlinkSync(filePath);
        if (data.type === 'message' && data.text) {
          if (typeof data.messageId === 'string' && data.messageId.trim()) {
            acknowledgeIpcMessage(data.messageId.trim());
          }
          messages.push(data.text);
        }
      } catch (err) {
        log(
          `Failed to process input file ${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
        try {
          fs.unlinkSync(filePath);
        } catch {
          /* ignore */
        }
      }
    }
    return messages;
  } catch (err) {
    log(`IPC drain error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

function waitForIpcMessage(): Promise<string | null> {
  return new Promise((resolve) => {
    const poll = () => {
      if (shouldClose()) {
        resolve(null);
        return;
      }
      const messages = drainIpcInput();
      if (messages.length > 0) {
        resolve(messages.join('\n'));
        return;
      }
      setTimeout(poll, IPC_POLL_MS);
    };
    poll();
  });
}

function getCodexApiKey(): string | undefined {
  return process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY;
}

function getThreadOptions(containerInput: ContainerInput): ThreadOptions {
  const additionalDirectories = ['/workspace/ipc'];
  const extraBase = '/workspace/extra';

  if (containerInput.isMain && fs.existsSync('/workspace/project')) {
    additionalDirectories.push('/workspace/project');
  }

  if (fs.existsSync(extraBase)) {
    for (const entry of fs.readdirSync(extraBase)) {
      const fullPath = path.join(extraBase, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        additionalDirectories.push(fullPath);
      }
    }
  }

  const model = process.env.CODEX_MODEL || process.env.OPENAI_MODEL;

  return {
    model: model || undefined,
    workingDirectory: GROUP_WORKSPACE,
    additionalDirectories,
    skipGitRepoCheck: true,
    sandboxMode: 'workspace-write',
    approvalPolicy: 'never',
    networkAccessEnabled: true,
    webSearchMode: 'live',
  };
}

function createCodexClient(
  containerInput: ContainerInput,
  mcpServerPath: string,
): Codex {
  const apiKey = getCodexApiKey();
  return new Codex({
    ...(apiKey ? { apiKey } : {}),
    ...(process.env.OPENAI_BASE_URL ? { baseUrl: process.env.OPENAI_BASE_URL } : {}),
    config: {
      features: {
        collab: true,
        collaboration_modes: true,
        multi_agent: true,
      },
      mcp_servers: {
        nanodex: {
          command: process.execPath,
          args: [mcpServerPath],
          env: {
            NANODEX_CHAT_JID: containerInput.chatJid,
            NANODEX_GROUP_FOLDER: containerInput.groupFolder,
            NANODEX_IS_MAIN: containerInput.isMain ? '1' : '0',
          },
          startup_timeout_ms: 30000,
          tool_timeout_sec: 120,
        },
      },
    },
  });
}

async function runTurn(
  thread: Thread,
  prompt: string,
): Promise<{ closedDuringTurn: boolean }> {
  const abortController = new AbortController();
  let closedDuringTurn = false;
  let loggedReasoning = false;
  let loggedReplyDraft = false;

  const pollHandle = setInterval(() => {
    if (shouldClose()) {
      closedDuringTurn = true;
      abortController.abort();
    }
  }, IPC_POLL_MS);

  try {
    const { events } = await thread.runStreamed(prompt, {
      signal: abortController.signal,
    });

    for await (const event of events) {
      if (event.type === 'thread.started') {
        log(`Thread initialized: ${event.thread_id}`);
      } else if (event.type === 'item.started') {
        const itemType = getItemType(event.item);
        if (itemType === 'reasoning' && !loggedReasoning) {
          loggedReasoning = true;
          log('Agent analyzing request');
        } else if (itemType === 'agent_message' && !loggedReplyDraft) {
          loggedReplyDraft = true;
          log('Assistant drafting reply');
        } else if (isToolItemType(itemType)) {
          const toolName = describeTool(event.item);
          log(toolName ? `Running tool: ${toolName}` : 'Running tool');
        }
      } else if (event.type === 'item.completed') {
        const itemType = getItemType(event.item);
        const agentMessageText = getAgentMessageText(event.item);
        if (itemType === 'agent_message' && agentMessageText) {
          writeOutput({
            status: 'success',
            result: agentMessageText,
            newSessionId: thread.id || undefined,
          });
        } else if (itemType === 'error') {
          const errorMessage = getItemErrorMessage(event.item);
          log(
            `Codex item error: ${errorMessage || 'Unknown item error'}`,
          );
        } else if (isToolItemType(itemType)) {
          const toolName = describeTool(event.item);
          log(toolName ? `Tool finished: ${toolName}` : 'Tool finished');
        }
      } else if (event.type === 'turn.failed') {
        throw new Error(event.error.message);
      } else if (event.type === 'error') {
        throw new Error(event.message);
      }
    }
  } catch (err) {
    if (closedDuringTurn && abortController.signal.aborted) {
      log('Turn aborted because the host requested container shutdown');
      return { closedDuringTurn };
    }
    throw err;
  } finally {
    clearInterval(pollHandle);
  }

  return { closedDuringTurn };
}

async function main(): Promise<void> {
  let containerInput: ContainerInput;

  try {
    const stdinData = await readStdin();
    containerInput = JSON.parse(stdinData);
    try {
      fs.unlinkSync('/tmp/input.json');
    } catch {
      /* ignore */
    }
    log(`Received input for group: ${containerInput.groupFolder}`);
  } catch (err) {
    writeOutput({
      status: 'error',
      result: null,
      error: `Failed to parse input: ${err instanceof Error ? err.message : String(err)}`,
    });
    process.exit(1);
    return;
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const mcpServerPath = path.join(__dirname, 'ipc-mcp-stdio.js');

  let sessionId = containerInput.sessionId;
  fs.mkdirSync(IPC_INPUT_DIR, { recursive: true });

  try {
    fs.unlinkSync(IPC_INPUT_CLOSE_SENTINEL);
  } catch {
    /* ignore */
  }

  let prompt = containerInput.prompt;
  if (containerInput.isScheduledTask) {
    prompt =
      '[SCHEDULED TASK - The following message was sent automatically and is not coming directly from the user or group.]\n\n' +
      prompt;
  }
  const pending = drainIpcInput();
  if (pending.length > 0) {
    log(`Draining ${pending.length} pending IPC messages into initial prompt`);
    prompt += '\n' + pending.join('\n');
  }

  const codex = createCodexClient(containerInput, mcpServerPath);
  const threadOptions = getThreadOptions(containerInput);
  const thread = sessionId
    ? codex.resumeThread(sessionId, threadOptions)
    : codex.startThread(threadOptions);

  try {
    while (true) {
      log(`Starting turn (thread: ${thread.id || 'new'})`);
      const turnResult = await runTurn(thread, prompt);
      if (thread.id) {
        sessionId = thread.id;
      }

      if (turnResult.closedDuringTurn) {
        log('Close sentinel consumed during turn, exiting');
        break;
      }

      writeOutput({
        status: 'success',
        result: null,
        newSessionId: sessionId,
      });

      log('Turn ended, waiting for next IPC message...');
      const nextMessage = await waitForIpcMessage();
      if (nextMessage === null) {
        log('Close sentinel received, exiting');
        break;
      }

      log(`Got new message (${nextMessage.length} chars), starting next turn`);
      prompt = nextMessage;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`Agent error: ${errorMessage}`);
    writeOutput({
      status: 'error',
      result: null,
      newSessionId: sessionId,
      error: errorMessage,
    });
    process.exit(1);
  }
}

main();
