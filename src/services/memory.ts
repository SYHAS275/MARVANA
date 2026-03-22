/**
 * Character Memory System
 *
 * After every N messages, Claude extracts key facts from the conversation
 * (name, interests, mood, personal details) and stores them in AsyncStorage.
 * These memories are injected into the system prompt so the character
 * "remembers" things the user has shared.
 */

import { saveData, loadData } from './storage';
import { Message } from '../types';

const MEMORY_KEY_PREFIX = 'char_memory_';
const EXTRACT_EVERY_N = 8;   // extract after every 8 new messages
const MAX_MEMORIES = 12;      // keep top 12 facts

export interface MemoryFact {
  fact: string;       // e.g. "User loves cricket"
  source: 'auto';
  addedAt: number;
}

export async function loadMemories(userId: string, characterId: string): Promise<MemoryFact[]> {
  try {
    const data = await loadData<MemoryFact[]>(`${MEMORY_KEY_PREFIX}${userId}_${characterId}`);
    return data || [];
  } catch {
    return [];
  }
}

export async function saveMemories(
  userId: string,
  characterId: string,
  memories: MemoryFact[],
): Promise<void> {
  await saveData(`${MEMORY_KEY_PREFIX}${userId}_${characterId}`, memories.slice(0, MAX_MEMORIES));
}

/** Returns true if we should attempt memory extraction now */
export function shouldExtractMemory(messageCount: number): boolean {
  return messageCount > 0 && messageCount % EXTRACT_EVERY_N === 0;
}

/** Format memories for injection into the system prompt */
export function formatMemoriesForPrompt(memories: MemoryFact[]): string {
  if (!memories.length) return '';
  const list = memories.map((m) => `- ${m.fact}`).join('\n');
  return `\n\n[Things you remember about this user from past conversations:\n${list}\nUse these naturally in conversation — don't repeat them robotically.]`;
}

/**
 * Extract new memory facts from a conversation using Claude.
 * Merges with existing memories (deduplicates by similarity).
 */
export async function extractAndUpdateMemories(
  userId: string,
  characterId: string,
  messages: Message[],
  apiKey: string,
): Promise<MemoryFact[]> {
  if (!apiKey) return [];

  // Only look at user messages
  const userMessages = messages
    .filter((m) => m.role === 'user' || m.senderId === userId)
    .slice(-20)
    .map((m) => m.content)
    .join('\n');

  if (userMessages.length < 30) return [];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'You extract key personal facts from user messages to help an AI remember them. Return ONLY a JSON array of short fact strings (max 12 words each). Examples: ["User loves cricket", "User is in 12th grade", "User\'s best friend is named Raj"]. Return [] if nothing notable.',
        messages: [
          {
            role: 'user',
            content: `Extract key personal facts from these user messages:\n\n${userMessages}`,
          },
        ],
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const text: string = data?.content?.[0]?.text || '[]';

    // Parse JSON array from response
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const newFacts: string[] = JSON.parse(match[0]);
    if (!Array.isArray(newFacts)) return [];

    const existing = await loadMemories(userId, characterId);
    const existingTexts = new Set(existing.map((m) => m.fact.toLowerCase()));

    const toAdd: MemoryFact[] = newFacts
      .filter((f) => typeof f === 'string' && f.length > 3 && !existingTexts.has(f.toLowerCase()))
      .slice(0, 6)
      .map((fact) => ({ fact, source: 'auto' as const, addedAt: Date.now() }));

    if (!toAdd.length) return existing;

    const merged = [...existing, ...toAdd].slice(0, MAX_MEMORIES);
    await saveMemories(userId, characterId, merged);
    return merged;
  } catch {
    return [];
  }
}
