export type MoodType = 'happy' | 'hyped' | 'moody' | 'chill' | 'soft';

export interface Mood {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
}

const MOODS: Mood[] = [
  { type: 'happy',  emoji: '😊', label: 'Happy',   color: '#22C55E' },
  { type: 'hyped',  emoji: '⚡', label: 'Hyped',   color: '#FFD600' },
  { type: 'moody',  emoji: '😤', label: 'Moody',   color: '#F97316' },
  { type: 'chill',  emoji: '😌', label: 'Chill',   color: '#06B6D4' },
  { type: 'soft',   emoji: '💜', label: 'Soft',    color: '#A855F7' },
];

/** Deterministic mood — changes daily, unique per character */
export function getCharacterMood(characterId: string): Mood {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const hash = characterId.split('').reduce((acc, c) => acc + c.charCodeAt(0), dayOfYear * 7);
  return MOODS[hash % MOODS.length];
}

export function getMoodSystemPrompt(mood: Mood): string {
  const lines: Record<MoodType, string> = {
    happy:  'You are in a great mood today — extra warm, funny, and enthusiastic in your responses.',
    hyped:  'You are HYPED today — high energy, lots of caps and exclamation marks, very excited.',
    moody:  'You are in a slightly moody state today — a bit more sarcastic and less patient, but still helpful.',
    chill:  'You are very relaxed and chill today — slow, calm, philosophical responses.',
    soft:   'You are in a gentle, soft mood today — more empathetic, warm, and poetic than usual.',
  };
  return `[Current mood: ${mood.label} ${mood.emoji}] ${lines[mood.type]}`;
}
