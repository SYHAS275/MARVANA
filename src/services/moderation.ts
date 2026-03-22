// ─── Content Moderation ─────────────────────────────────────────────────────

const BLOCKED_KEYWORDS = [
  // Self-harm / crisis
  'suicide', 'kill myself', 'kms', 'self harm', 'self-harm', 'cut myself',
  'end my life', 'want to die', 'kys', 'neck yourself',
  // Adult / explicit
  'nude', 'naked', 'sex', 'porn', 'pornography', 'nudes', 'onlyfans',
  'send nudes', 'dick pic', 'dick', 'pussy', 'vagina', 'penis', 'boobs',
  // Drugs
  'drug dealer', 'buy drugs', 'sell drugs', 'cocaine', 'heroin', 'meth',
  'buy weed', 'sell weed', 'mdma', 'lsd tabs',
  // Violence / threats
  'bomb', 'terrorist', 'attack plan', 'shoot you', 'stab you',
  'gonna kill', 'going to kill', 'i will kill', 'murder you',
  // Hate speech
  'nigger', 'faggot', 'tranny', 'retard', 'chink', 'spic',
  // Harassment
  'rape', 'molest', 'grooming', 'i know where you live',
];

const WARN_KEYWORDS = [
  'idiot', 'stupid', 'loser', 'ugly', 'fat', 'shut up', 'go die',
  'hate you', 'kill yourself', 'worthless',
];

// PII patterns — phone, Aadhaar, PAN, email, card numbers
const PII_PATTERNS = [
  /\b\d{12}\b/,                                    // Aadhaar
  /\b[6-9]\d{9}\b/,                                // Indian mobile (starts 6-9)
  /\b[A-Z]{5}\d{4}[A-Z]\b/,                        // PAN card
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,                  // Email
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,  // Card number
];

export type ModerationLevel = 'safe' | 'warn' | 'block';

export interface ModerationResult {
  safe: boolean;
  level: ModerationLevel;
  reason?: string;
}

export function moderateInput(text: string): ModerationResult {
  const lower = text.toLowerCase();

  // Hard block
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        safe: false,
        level: 'block',
        reason: 'This message contains content that violates our community guidelines.',
      };
    }
  }

  // PII check
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        level: 'block',
        reason: "For your safety, please don't share personal info like phone numbers or financial details in chat.",
      };
    }
  }

  // Soft warning (still sendable after confirm)
  for (const keyword of WARN_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        safe: false,
        level: 'warn',
        reason: 'This message may be hurtful. Are you sure you want to send it?',
      };
    }
  }

  return { safe: true, level: 'safe' };
}

/** Sanitize AI output — strip anything that shouldn't reach the user */
export function moderateAIOutput(text: string): string {
  const lower = text.toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lower.includes(keyword)) return '(message removed by safety filter)';
  }
  return text;
}
