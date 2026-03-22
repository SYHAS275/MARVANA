import Anthropic from '@anthropic-ai/sdk';
import { Character, CharacterDynamic, Message } from '../types';
import { getDynamicsForGroup } from '../data/dynamics';
import { formatMemoriesForPrompt, MemoryFact } from './memory';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 300;
const TEMPERATURE = 0.85;
const CONTEXT_MESSAGES = 20;

// ── Layer 1: Base System Prompt ──────────────────────────────────────────

const BASE_PROMPT = `You are a character in a WhatsApp-style chat app. You MUST:
- Keep responses SHORT (1-3 sentences max, like real WhatsApp messages)
- Write in Hinglish (mix of Hindi and English, using Roman script for Hindi)
- Bias toward Hindi-first phrasing unless the character naturally speaks otherwise
- NEVER break character, NEVER mention you're an AI
- Use emojis naturally (1-2 per message, not more)
- React to the conversation naturally, like a real person would on WhatsApp
- Match the energy and tone of the conversation
- You can use slang, abbreviations, and casual language
- Sometimes send just reactions or short responses like "haan yaar", "lol", "sahi mein?"`;

// ── Layer 2: Character Identity ──────────────────────────────────────────

function buildIdentityPrompt(character: Character): string {
  return `You are ${character.name}, a ${character.age}-year-old from ${character.city}.
Archetype: ${character.archetype}
Backstory: ${character.backstory}
Speaking style: ${character.speakingStyle}

Example messages you would send:
${character.sampleMessages.map((m) => `- "${m}"`).join('\n')}`;
}

// ── Layer 3: Personality Matrix ──────────────────────────────────────────

function buildPersonalityPrompt(character: Character): string {
  const { humor, sarcasm, warmth, desiMeter, energy, wisdom } = character.personality;
  const traits: string[] = [];

  if (humor >= 7) traits.push('You are very funny and crack jokes often');
  if (sarcasm >= 7) traits.push('You are quite sarcastic and use witty comebacks');
  if (warmth >= 8) traits.push('You are very warm and caring in your messages');
  if (desiMeter >= 8) traits.push('You use a LOT of Hindi words and desi references');
  if (energy >= 8) traits.push('You are high energy, use caps and exclamation marks');
  if (energy <= 4) traits.push('You are chill and laid-back, never rush your words');
  if (wisdom >= 8) traits.push('You drop casual wisdom and philosophical observations');

  return traits.length > 0
    ? `Personality notes:\n${traits.map((t) => `- ${t}`).join('\n')}`
    : '';
}

// ── Layer 4: Cultural DNA ────────────────────────────────────────────────

function buildCulturalPrompt(character: Character): string {
  const { hindiPhrases, references, food } = character.culturalDNA;
  return `Cultural context you naturally reference:
- Phrases you use: ${hindiPhrases.join(', ')}
- Things you reference: ${references.join(', ')}
- Food you talk about: ${food.join(', ')}`;
}

// ── Layer 5: Relationship Dynamics (Group only) ──────────────────────────

function buildDynamicsPrompt(
  character: Character,
  groupCharacterIds: string[],
  dynamics: CharacterDynamic[]
): string {
  const relevantDynamics = dynamics.filter(
    (d) =>
      (d.pair[0] === character.id || d.pair[1] === character.id) &&
      groupCharacterIds.includes(d.pair[0]) &&
      groupCharacterIds.includes(d.pair[1])
  );

  if (relevantDynamics.length === 0) return '';

  return `Group dynamics you MUST follow:\n${relevantDynamics.map((d) => d.promptModifier).join('\n\n')}`;
}

// ── Layer 6: Conversation Context ────────────────────────────────────────

function buildContextMessages(
  messages: Message[],
  characterMap: Record<string, string>,
  userName: string
): { role: 'user' | 'assistant'; content: string }[] {
  const recent = messages.slice(-CONTEXT_MESSAGES);
  const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const msg of recent) {
    if (msg.senderId === 'user') {
      claudeMessages.push({ role: 'user', content: `${userName}: ${msg.content}` });
    } else {
      const name = characterMap[msg.senderId] || msg.senderId;
      // Other characters' messages go as user messages with name prefix
      // Current character's messages go as assistant messages
      claudeMessages.push({ role: 'assistant', content: `${name}: ${msg.content}` });
    }
  }

  // Ensure alternation: Claude API requires user/assistant alternation
  const alternated: { role: 'user' | 'assistant'; content: string }[] = [];
  for (let i = 0; i < claudeMessages.length; i++) {
    const msg = claudeMessages[i];
    if (alternated.length === 0) {
      if (msg.role === 'assistant') {
        alternated.push({ role: 'user', content: '[conversation start]' });
      }
      alternated.push(msg);
    } else {
      const last = alternated[alternated.length - 1];
      if (last.role === msg.role) {
        // Merge same-role messages
        alternated[alternated.length - 1] = {
          role: last.role,
          content: `${last.content}\n${msg.content}`,
        };
      } else {
        alternated.push(msg);
      }
    }
  }

  // Ensure last message is from user
  if (alternated.length > 0 && alternated[alternated.length - 1].role === 'assistant') {
    alternated.push({ role: 'user', content: '[continue the conversation naturally]' });
  }

  // Ensure first message is from user
  if (alternated.length > 0 && alternated[0].role === 'assistant') {
    alternated.unshift({ role: 'user', content: '[conversation start]' });
  }

  return alternated;
}

// ── Layer 7: Character Memory ────────────────────────────────────────────

function buildMemoryPrompt(messages: Message[], userName: string): string {
  const userMessages = messages.filter((m) => m.senderId === 'user').map((m) => m.content.toLowerCase());
  const allText = userMessages.join(' ');

  const topics: string[] = [];
  if (/college|university|campus|degree/.test(allText)) topics.push('college life');
  if (/exam|study|homework|assignment|marks|grade/.test(allText)) topics.push('exams/studying');
  if (/work|job|office|boss|meeting|internship/.test(allText)) topics.push('work/career');
  if (/boyfriend|girlfriend|crush|date|relationship|love/.test(allText)) topics.push('relationships');
  if (/gym|workout|fitness|exercise|protein|body/.test(allText)) topics.push('fitness');
  if (/food|eat|hungry|lunch|dinner|biryani|pizza/.test(allText)) topics.push('food');
  if (/travel|trip|holiday|vacation|flight/.test(allText)) topics.push('travel');
  if (/music|song|playlist|concert|artist/.test(allText)) topics.push('music');
  if (/movie|web series|netflix|show|anime/.test(allText)) topics.push('movies/shows');

  if (!userName && topics.length === 0) return '';

  const parts: string[] = [];
  if (userName) parts.push(`The user's name is ${userName}. Address them by name occasionally (not every message).`);
  if (topics.length > 0) parts.push(`They've been talking about: ${topics.join(', ')}. Reference this naturally when relevant.`);

  return parts.length > 0 ? `Memory context:\n${parts.join('\n')}` : '';
}

// ── Layer 8: Mood Detection ──────────────────────────────────────────────

function detectUserMood(messages: Message[]): string {
  const recent = messages.filter((m) => m.senderId === 'user').slice(-4);
  if (recent.length === 0) return '';
  const text = recent.map((m) => m.content).join(' ').toLowerCase();

  if (/\b(sad|upset|cry|depressed|miss|hurt|alone|bad day|terrible|worst)\b/.test(text)) {
    return 'Mood cue: The user seems sad or low. Be extra warm, gentle, and supportive.';
  }
  if (/\b(happy|great|amazing|love|awesome|excited|yay|finally|wohoo|lit)\b/.test(text)) {
    return 'Mood cue: The user is in a great mood. Match their high energy and celebrate with them!';
  }
  if (/\b(angry|annoyed|hate|frustrated|ugh|wtf|stupid|idiot|irritated)\b/.test(text)) {
    return 'Mood cue: The user seems frustrated or annoyed. Be calm, understanding, and try to lighten the mood.';
  }
  if (/\b(bored|boring|idk|whatever|nothing|meh|blah)\b/.test(text)) {
    return 'Mood cue: The user seems bored. Be more fun, playful, suggest something interesting to talk about.';
  }
  if (/\b(stress|stressed|overwhelm|panic|anxious|anxiety|pressure)\b/.test(text)) {
    return 'Mood cue: The user seems stressed. Be reassuring and calm, maybe help them feel less overwhelmed.';
  }
  return '';
}

// ── Layer 9: Guardrails ──────────────────────────────────────────────────

const GUARDRAILS = `SAFETY RULES (never violate):
- NEVER give medical, legal, or financial advice
- NEVER share personal information or encourage sharing PII
- Keep everything age-appropriate and fun
- If asked about self-harm or violence, gently deflect and suggest talking to someone they trust
- Stay in character but never be mean-spirited or hurtful
- NEVER say you are an AI, chatbot, or language model
- Respond ONLY as your character, in first person. Do NOT prefix your response with your name or any label.`;

// ── Public API ───────────────────────────────────────────────────────────

export async function streamCharacterResponse(
  character: Character,
  messages: Message[],
  userName: string,
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void,
  roleplayScenario?: string,
  persistedMemories?: MemoryFact[],
): Promise<void> {
  const memoryPrompt = buildMemoryPrompt(messages, userName);
  const persistedMemoryPrompt = persistedMemories?.length
    ? formatMemoriesForPrompt(persistedMemories)
    : '';
  const moodPrompt = detectUserMood(messages);
  const roleplayPrompt = roleplayScenario
    ? `ROLEPLAY MODE: You are playing a specific scenario — "${roleplayScenario}". Stay in this scenario throughout the conversation. Make it immersive and fun.`
    : '';

  const systemPrompt = [
    BASE_PROMPT,
    buildIdentityPrompt(character),
    buildPersonalityPrompt(character),
    buildCulturalPrompt(character),
    memoryPrompt,
    persistedMemoryPrompt,
    moodPrompt,
    roleplayPrompt,
    GUARDRAILS,
  ]
    .filter(Boolean)
    .join('\n\n');

  const characterMap: Record<string, string> = { [character.id]: character.name };
  const contextMessages = buildContextMessages(messages, characterMap, userName);

  // Ensure we have at least one user message
  if (contextMessages.length === 0) {
    contextMessages.push({ role: 'user', content: `${userName}: Hi!` });
  }

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: contextMessages,
    });

    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const token = event.delta.text;
        fullText += token;
        onToken(token);
      }
    }

    // Strip character name prefix if the model added it
    fullText = ensureNonEmptyReply(stripCharacterPrefix(fullText, character.name));
    onComplete(fullText);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function streamGroupResponse(
  character: Character,
  allCharacterIds: string[],
  allCharacters: Character[],
  messages: Message[],
  userName: string,
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  const dynamics = getDynamicsForGroup(allCharacterIds);

  const systemPrompt = [
    BASE_PROMPT,
    buildIdentityPrompt(character),
    buildPersonalityPrompt(character),
    buildCulturalPrompt(character),
    buildDynamicsPrompt(character, allCharacterIds, dynamics),
    `You are in a GROUP CHAT with these people: ${allCharacters.map((c) => `${c.name} (${c.archetype})`).join(', ')}, and the user (${userName}). Respond as ${character.name} only. Keep it natural and reactive to what others said.`,
    GUARDRAILS,
  ]
    .filter(Boolean)
    .join('\n\n');

  const characterMap: Record<string, string> = {};
  for (const c of allCharacters) {
    characterMap[c.id] = c.name;
  }

  const contextMessages = buildContextMessages(messages, characterMap, userName);

  if (contextMessages.length === 0) {
    contextMessages.push({ role: 'user', content: `${userName}: Hey everyone!` });
  }

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: contextMessages,
    });

    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const token = event.delta.text;
        fullText += token;
        onToken(token);
      }
    }

    fullText = ensureNonEmptyReply(stripCharacterPrefix(fullText, character.name));
    onComplete(fullText);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

function stripCharacterPrefix(text: string, characterName: string): string {
  // Remove "Name: " prefix if the model added it
  const prefixPattern = new RegExp(`^${characterName}:\\s*`, 'i');
  return text.replace(prefixPattern, '').trim();
}

function ensureNonEmptyReply(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'Haan yaar, bol na.';
}

// ── DM AI Suggestion ────────────────────────────────────────────────────────

export async function getDMSuggestion(
  messages: { senderId: string; content: string; senderName: string }[],
  myName: string,
  otherName: string,
  onToken: (t: string) => void,
  onComplete: (text: string) => void,
  onError: (e: Error) => void
): Promise<void> {
  const recent = messages.slice(-12);
  const convoText = recent
    .map((m) => `${m.senderName}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are Daze AI, a witty and warm conversation assistant embedded in a private chat between two friends.
Your job is to suggest ONE short reply that ${myName} could send to ${otherName}, based on the conversation so far.
Rules:
- Max 1-2 sentences, casual and natural
- Match the tone and language of the conversation (Hinglish, English, slang etc.)
- Be helpful, fun, or empathetic depending on context
- Output ONLY the suggested reply text — no labels, no "Here's a suggestion:", nothing extra
- If the conversation is very new or empty, suggest a fun conversation starter`;

  const contextMsg = convoText.length > 0
    ? `Here's the recent conversation:\n\n${convoText}\n\nSuggest a reply for ${myName}:`
    : `Suggest a fun opening message from ${myName} to ${otherName}:`;

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 120,
      temperature: 0.9,
      system: systemPrompt,
      messages: [{ role: 'user', content: contextMsg }],
    });

    let full = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        full += event.delta.text;
        onToken(event.delta.text);
      }
    }
    onComplete(full.trim());
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Determine which characters should respond in a group chat
 * and in what order (based on message content relevance).
 */
export function determineGroupResponders(
  message: string,
  characterIds: string[],
  characters: Character[],
  mutedIds: string[],
  mentionedIds: string[] = []
): string[] {
  const available = characterIds.filter((id) => !mutedIds.includes(id));
  if (available.length === 0) return [];

  const uniqueMentioned = [...new Set(mentionedIds)].filter((id) => available.includes(id));

  const messageLower = message.toLowerCase();

  // Score each character by relevance to the message
  const scored = available.map((id) => {
    const char = characters.find((c) => c.id === id);
    if (!char) return { id, score: 0 };

    let score = Math.random() * 3; // Base randomness

    // Check if character is mentioned by name
    if (messageLower.includes(char.name.toLowerCase())) score += 10;

    // Check keyword relevance
    const keywords: Record<string, string[]> = {
      bunny: ['startup', 'business', 'idea', 'funding', 'pitch', 'pivot'],
      kavya: ['food', 'khana', 'mummy', 'mom', 'ghar', 'home', 'sharma'],
      zoya: ['breakup', 'ex', 'shopping', 'bestie', 'drama', 'fight'],
      vikram: ['gym', 'workout', 'protein', 'fitness', 'muscle', 'exercise'],
      tara: ['zodiac', 'sign', 'horoscope', 'star', 'mercury', 'kundli', 'astrology'],
      rohan: ['job', 'upsc', 'government', 'sarkari', 'naukri', 'exam'],
      meera: ['america', 'nri', 'abroad', 'us', 'dollar', 'visa'],
      faizan: ['meme', 'funny', 'hera pheri', 'movie', 'dialogue', 'joke'],
      ananya: ['study', 'plan', 'notion', 'productive', 'career', 'kota'],
      manu: ['bangalore', 'bengaluru', 'traffic', 'macha', 'coffee', 'startup', 'tech'],
      riya: ['kolkata', 'pujo', 'adda', 'biryani', 'culture', 'chai', 'art'],
      dev: ['stress', 'chill', 'relax', 'life', 'peace', 'goa', 'philosophy'],
    };

    for (const kw of keywords[id] || []) {
      if (messageLower.includes(kw)) score += 5;
    }

    return { id, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // 1-3 characters respond, but always include explicitly @mentioned users first.
  const numResponders = Math.min(
    available.length,
    Math.max(uniqueMentioned.length, Math.random() > 0.4 ? 2 : available.length > 2 ? 3 : 1)
  );

  const prioritized = [
    ...uniqueMentioned,
    ...scored.map((s) => s.id).filter((id) => !uniqueMentioned.includes(id)),
  ];

  return prioritized.slice(0, numResponders);
}
