import { Channel, NewMessage } from './types.js';
import { formatLocalTime } from './timezone.js';

export function escapeXml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMessages(
  messages: NewMessage[],
  timezone: string,
): string {
  const lines = messages.map((m) => {
    const displayTime = formatLocalTime(m.timestamp, timezone);
    return `<message sender="${escapeXml(m.sender_name)}" time="${escapeXml(displayTime)}">${escapeXml(m.content)}</message>`;
  });

  const header = `<context timezone="${escapeXml(timezone)}" />\n`;

  return `${header}<messages>\n${lines.join('\n')}\n</messages>`;
}

export function stripInternalTags(text: string): string {
  return text.replace(/<internal>[\s\S]*?<\/internal>/g, '').trim();
}

function isMetaAssistantLine(line: string): boolean {
  const normalized = line.trim();
  if (!normalized) return false;

  return (
    /^Sent\b/i.test(normalized) ||
    /^Message sent\.?$/i.test(normalized) ||
    /^I(?:'m|’m| am)\s+(replying|answering|sending|responding|keeping|working|using)\b/i.test(
      normalized,
    )
  );
}

export function sanitizeAssistantReply(rawText: string): string {
  const text = stripInternalTags(rawText);
  if (!text) return '';

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !isMetaAssistantLine(paragraph));

  if (paragraphs.length === 0) return '';
  return paragraphs.join('\n\n');
}

export function formatOutbound(rawText: string): string {
  const text = sanitizeAssistantReply(rawText);
  if (!text) return '';
  return text;
}

export function routeOutbound(
  channels: Channel[],
  jid: string,
  text: string,
): Promise<void> {
  const channel = channels.find((c) => c.ownsJid(jid) && c.isConnected());
  if (!channel) throw new Error(`No channel for JID: ${jid}`);
  return channel.sendMessage(jid, text);
}

export function findChannel(
  channels: Channel[],
  jid: string,
): Channel | undefined {
  return channels.find((c) => c.ownsJid(jid));
}
