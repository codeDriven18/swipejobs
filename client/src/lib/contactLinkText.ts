export type ContactTextPart =
  | { type: 'text'; value: string }
  | { type: 'telegram'; display: string; username: string }
  | { type: 'phone'; display: string; tel: string };

interface Match {
  start: number;
  end: number;
  part: ContactTextPart;
}

const TELEGRAM_URL_RE = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z][a-zA-Z0-9_]{4,31})(?:\/|\b|$)/gi;
const TELEGRAM_HANDLE_RE = /(?<![\w/@])@([a-zA-Z][a-zA-Z0-9_]{4,31})\b/g;
const PHONE_RE = /(?<![\w@])(\+?\d[\d\s().-]{6,14}\d)(?![\w@])/g;

function normalizeTel(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

function isLikelyPhone(raw: string): boolean {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return false;
  if (trimmed.startsWith('+')) return digits.length >= 8;
  if (/[\s().-]/.test(trimmed)) return digits.length >= 7;
  return digits.length >= 10;
}

function findMatches(text: string): Match[] {
  const matches: Match[] = [];

  for (const re of [TELEGRAM_URL_RE, TELEGRAM_HANDLE_RE, PHONE_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const value = match[0];
      const username = match[1];

      if (re === PHONE_RE) {
        if (!isLikelyPhone(value)) continue;
        matches.push({
          start: match.index,
          end: match.index + value.length,
          part: {
            type: 'phone',
            display: value,
            tel: normalizeTel(value),
          },
        });
        continue;
      }

      matches.push({
        start: match.index,
        end: match.index + value.length,
        part: {
          type: 'telegram',
          display: value,
          username,
        },
      });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const filtered: Match[] = [];
  let lastEnd = 0;
  for (const item of matches) {
    if (item.start >= lastEnd) {
      filtered.push(item);
      lastEnd = item.end;
    }
  }

  return filtered;
}

export function parseContactLinkText(text: string): ContactTextPart[] {
  if (!text) return [{ type: 'text', value: '' }];

  const matches = findMatches(text);
  if (matches.length === 0) return [{ type: 'text', value: text }];

  const parts: ContactTextPart[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, match.start) });
    }
    parts.push(match.part);
    cursor = match.end;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor) });
  }

  return parts;
}
