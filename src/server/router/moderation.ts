import { SKIN_KEYWORD_MAP } from '../../shared/constants.ts';
import type { CharacterSkinId } from '../../shared/types.ts';

/**
 * Moderation, Unicode Sanitization & Vietnamese Text Utilities
 * Blocks Zalgo combining mark floods, Cuneiform/Braille spam blocks, control characters,
 * scam URLs, and profanity while preserving 100% valid Vietnamese diacritics.
 */

const UNICODE_SPAM_BLOCKS_RE =
  /[\u{12000}-\u{1254F}\uFDFD\u2800-\u28FF\u2580-\u259F\uFFF0-\uFFFF]|[\u0300-\u036F]{3,}/u;

const BRACKET_EMOTE_RE = /\[[^\]]{1,28}\]/g;

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g;

const ALLOWED_VI_TEXT_RE =
  /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?'"()-]/g;

const ALLOWED_VI_NAME_RE =
  /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s._-]/g;

const VI_LETTER_RE = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/g;

const BLOCKED_TERMS_RE =
  /\b(địt|lồn|cặc|đm|đmm|vcl|vl|cc|đéo|buồi|dái|lừa đảo|cờ bạc|tài xỉu|nhà cái|bet88|kubet|telegram|zalo\.me|http:\/\/|https:\/\/)\b/i;

export interface ModerationCheckResult {
  allowed: boolean;
  reason?: 'empty' | 'unicode_spam' | 'profanity_or_link' | 'too_few_letters';
  cleanedText: string;
}

export function isToxicOrSpamRaw(raw: string): { blocked: boolean; reason?: ModerationCheckResult['reason'] } {
  if (!raw || typeof raw !== 'string') {
    return { blocked: true, reason: 'empty' };
  }
  if (UNICODE_SPAM_BLOCKS_RE.test(raw)) {
    return { blocked: true, reason: 'unicode_spam' };
  }
  const normalized = raw.normalize('NFKC').normalize('NFC');
  if (BLOCKED_TERMS_RE.test(normalized)) {
    return { blocked: true, reason: 'profanity_or_link' };
  }
  return { blocked: false };
}

export function sanitizeDisplayName(rawName: string | undefined | null): string {
  const raw = String(rawName || '');
  if (UNICODE_SPAM_BLOCKS_RE.test(raw)) {
    return 'Phật Tử Hữu Duyên';
  }
  const cleaned = raw
    .normalize('NFKC')
    .normalize('NFC')
    .replace(CONTROL_CHARS_RE, '')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_NAME_RE, ' ')
    .replace(/(.)\1{3,}/gu, '$1$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);

  if (!cleaned || BLOCKED_TERMS_RE.test(cleaned)) {
    return 'Phật Tử Hữu Duyên';
  }
  const letters = cleaned.match(VI_LETTER_RE);
  if (!letters || letters.length < 2) {
    return 'Phật Tử Hữu Duyên';
  }
  return cleaned;
}

export function moderateAndSanitizeComment(
  rawComment: string | undefined | null,
  moderationEnabled = true
): ModerationCheckResult {
  const raw = String(rawComment || '').trim();
  if (!raw) {
    return { allowed: false, reason: 'empty', cleanedText: '' };
  }

  if (moderationEnabled) {
    const rawCheck = isToxicOrSpamRaw(raw);
    if (rawCheck.blocked) {
      return { allowed: false, reason: rawCheck.reason, cleanedText: '' };
    }
  }

  const cleaned = raw
    .normalize('NFKC')
    .normalize('NFC')
    .replace(CONTROL_CHARS_RE, '')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_TEXT_RE, ' ')
    .replace(/([.,!?'-])\1+/g, '$1')
    .replace(/(.)\1{3,}/gu, '$1$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,!?\s-]+|[.,!?\s-]+$/g, '')
    .trim()
    .slice(0, 120);

  if (!cleaned) {
    return { allowed: false, reason: 'empty', cleanedText: '' };
  }
  if (moderationEnabled && BLOCKED_TERMS_RE.test(cleaned)) {
    return { allowed: false, reason: 'profanity_or_link', cleanedText: '' };
  }

  const letters = cleaned.match(VI_LETTER_RE);
  const digits = cleaned.match(/[0-9]/g);
  if ((!letters || letters.length < 1) && (!digits || digits.length < 1)) {
    return { allowed: false, reason: 'too_few_letters', cleanedText: '' };
  }

  return { allowed: true, cleanedText: cleaned };
}

/**
 * Matches short outfit change commands (<= 3 words) so "Nam mô A Di Đà Phật"
 * never falsely triggers the "nam" (male) outfit.
 */
export function matchSkinKeyword(comment: string): CharacterSkinId | null {
  const cleaned = String(comment || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;
  const words = cleaned.split(' ');
  if (words.length > 3) return null;

  for (const entry of SKIN_KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (cleaned === kw || cleaned.startsWith(kw + ' ')) {
        return entry.skin;
      }
    }
  }
  return null;
}

export function sanitizeSpokenName(nickname: string): string {
  const s = sanitizeDisplayName(nickname)
    .replace(/[_@.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || 'Phật tử hữu duyên';
}

export function escapeHtml(input: string): string {
  return String(input || '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });
}
