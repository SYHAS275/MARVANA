import type { ImageSourcePropType } from 'react-native';

export interface Character {
  id: string;
  name: string;
  archetype: string;
  city: string;
  age: number;
  tagline: string;
  backstory: string;
  speakingStyle: string;
  sampleMessages: string[];
  personality: PersonalityMatrix;
  culturalDNA: CulturalDNA;
  avatarColor: string;
  avatarEmoji: string;
  avatarImage?: ImageSourcePropType;
  isPremium?: boolean;
}

export interface PersonalityMatrix {
  humor: number;       // 0-10
  sarcasm: number;     // 0-10
  warmth: number;      // 0-10
  desiMeter: number;   // 0-10 (how much Hindi/desi references)
  energy: number;      // 0-10
  wisdom: number;      // 0-10
}

export interface CulturalDNA {
  hindiPhrases: string[];
  references: string[];
  food: string[];
  festivals: string[];
}

export interface CharacterDynamic {
  pair: [string, string]; // character IDs
  description: string;
  tension: string;
  promptModifier: string;
}

export interface GroupScenario {
  id: string;
  name: string;
  description: string;
  characterIds: string[];
  openingContext: string;
  emoji: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string; // 'user' or character ID
  content: string;
  timestamp: number;
  reactions: Reaction[];
  isStreaming?: boolean;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Chat {
  id: string;
  type: 'individual' | 'group';
  characterIds: string[];
  title: string;
  lastMessage?: string;
  lastMessageTime?: number;
  scenarioId?: string;
  mutedCharacters: string[];
  messageCount?: number; // total user messages sent, for relationship level
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  favoriteCharacters: string[];
  onboarded: boolean;
  loggedIn: boolean;
  streakCount: number;
  lastChatDate: string | null; // YYYY-MM-DD
  avatarUrl?: string;
  bio?: string;
  preferredLanguage?: string; // BCP-47 e.g. 'hi-IN'
  coins?: number;
  isPremium?: boolean;
}

export interface ConversationStarter {
  characterId: string;
  prompts: string[];
}

export type OnboardingStep = 'name' | 'characters' | 'done';
