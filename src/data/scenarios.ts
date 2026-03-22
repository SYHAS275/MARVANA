import { GroupScenario } from '../types';

export const scenarios: GroupScenario[] = [
  {
    id: 'startup-vs-sarkari',
    name: 'Startup vs Sarkari',
    description: 'Bunny pitches his new idea. Rohan is not impressed.',
    characterIds: ['bunny', 'rohan'],
    openingContext: 'Bunny just announced his 8th startup pivot and Rohan has strong opinions about it.',
    emoji: '⚔️',
  },
  {
    id: 'family-dinner-chaos',
    name: 'Family Dinner Chaos',
    description: 'Kavya hosts dinner. Chaos ensues.',
    characterIds: ['kavya', 'zoya', 'rohan'],
    openingContext: 'Kavya has invited everyone for dinner and is already asking about marriage plans. Zoya is defending the user. Rohan is judging everyone\'s career choices.',
    emoji: '🍽️',
  },
  {
    id: 'gym-vs-goa',
    name: 'Gym vs Goa',
    description: 'Should you grind or chill? The eternal debate.',
    characterIds: ['vikram', 'dev'],
    openingContext: 'The user mentioned they\'re stressed. Vikram prescribes the gym. Dev prescribes Goa.',
    emoji: '🏋️',
  },
  {
    id: 'stars-vs-spreadsheets',
    name: 'Stars vs Spreadsheets',
    description: 'Tara reads your chart. Ananya reads your data.',
    characterIds: ['tara', 'ananya'],
    openingContext: 'The user asked for life advice. Tara pulled up their birth chart. Ananya opened a Notion template.',
    emoji: '🔮',
  },
  {
    id: 'nri-vs-desi',
    name: 'NRI vs Desi Internet',
    description: 'Meera misses India. Faizan sends memes about it.',
    characterIds: ['meera', 'faizan'],
    openingContext: 'Meera is feeling homesick and posted about it. Faizan responded with a Hera Pheri meme.',
    emoji: '🌏',
  },
  {
    id: 'boomer-alliance',
    name: 'Boomer Alliance',
    description: 'Kavya and Rohan unite against Gen Z.',
    characterIds: ['kavya', 'rohan'],
    openingContext: 'Kavya and Rohan discovered they agree on everything about "aaj kal ke bachche." The user is caught in the crossfire.',
    emoji: '👴',
  },
  {
    id: 'full-adda',
    name: 'Full Adda',
    description: 'Everyone\'s here. Pure chaos.',
    characterIds: ['bunny', 'zoya', 'faizan', 'kavya'],
    openingContext: 'It\'s a Friday night group chat. Everyone has opinions. No one is sleeping.',
    emoji: '🎉',
  },
  {
    id: 'blr-vs-hustle',
    name: 'Bangalore Burnout Boardroom',
    description: 'Manu and Ananya debate hustle vs sustainability.',
    characterIds: ['manu', 'ananya'],
    openingContext: 'The user says they are exhausted from work. Ananya suggests a stricter productivity system; Manu suggests a realistic pace and filter coffee break.',
    emoji: '☕',
  },
  {
    id: 'chai-adda-nation',
    name: 'Chai Adda Across India',
    description: 'Riya, Manu, and Faizan turn one chai chat into a culture fest.',
    characterIds: ['riya', 'manu', 'faizan'],
    openingContext: 'The user asks for comfort after a rough day. Riya brings warmth and poetry, Manu brings practical calm, Faizan brings meme chaos.',
    emoji: '🫖',
  },
];

export const getScenario = (id: string): GroupScenario | undefined =>
  scenarios.find((s) => s.id === id);
