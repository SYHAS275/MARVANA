import { ConversationStarter } from '../types';

export const conversationStarters: ConversationStarter[] = [
  {
    characterId: 'bunny',
    prompts: [
      'Bro what\'s your latest startup idea?',
      'Mujhe bhi startup karna hai, guide karo',
      'Shark Tank mein jaoge toh kya pitch karoge?',
      'Delhi mein best co-working space kaunsa hai?',
    ],
  },
  {
    characterId: 'kavya',
    prompts: [
      'Aaj khana nahi khaya maine 😅',
      'Mummy mujhe kuch advice do',
      'Sharma ji ka beta kya kar raha hai aajkal?',
      'Ghar ki yaad aa rahi hai 🥺',
    ],
  },
  {
    characterId: 'zoya',
    prompts: [
      'Yaar mera breakup ho gaya 💔',
      'Mujhe shopping pe le chalo',
      'Office mein drama ho gaya today',
      'Koi acha cafe batao Mumbai mein',
    ],
  },
  {
    characterId: 'sana',
    prompts: [
      'SoBo ka perfect day plan banao',
      'Yaar relationship confusion hai, help karo',
      'Mumbai mein classy but fun date spot batao',
      'Mujhe confidence boost chahiye, pep talk do',
    ],
  },
  {
    characterId: 'vikram',
    prompts: [
      'Bhai gym start karna hai, kaise karoon?',
      'Mera weight loss nahi ho raha 😢',
      'Best protein powder kaunsa hai?',
      'Aaj bahut lazy feel ho raha hai',
    ],
  },
  {
    characterId: 'tara',
    prompts: [
      'Meri kundli padho na please 🙏',
      'Aaj ka din kaisa rahega mera?',
      'Main Scorpio hoon, kya expect karoon?',
      'Mercury retrograde mein kya avoid karoon?',
    ],
  },
  {
    characterId: 'rohan',
    prompts: [
      'Uncle, UPSC ki taiyari kaise karoon?',
      'Government job vs private job?',
      'Aaj kal ke bachche kya kar rahe hain?',
      'Startup karna chahta hoon, advice do',
    ],
  },
  {
    characterId: 'meera',
    prompts: [
      'America mein life kaisi hai?',
      'India ki kya cheez sabse zyada miss karti ho?',
      'NRI life ke pros and cons batao',
      'Wahan ka khana kaisa hai?',
    ],
  },
  {
    characterId: 'faizan',
    prompts: [
      'Koi acha meme bhejo yaar 😂',
      'Hera Pheri ka best dialogue kaunsa hai?',
      'Aaj mood kharab hai, hasao mujhe',
      'Hyderabad ki biryani vs Lucknow ki biryani?',
    ],
  },
  {
    characterId: 'ananya',
    prompts: [
      'Mujhe productive hona hai, help karo',
      'Best Notion template kaunsa hai?',
      'Kota coaching kaisi thi?',
      'Apna 10-year plan batao',
    ],
  },
  {
    characterId: 'manu',
    prompts: [
      'Bangalore traffic survive kaise karte ho?',
      'Macha, startup join karun ya stable job loon?',
      'Best filter coffee spot in Bengaluru?',
      'Yaake sab log Silk Board se darte hain?',
    ],
  },
  {
    characterId: 'riya',
    prompts: [
      'Kolkata ka best comfort food kya hai?',
      'Durga Pujo vibe explain karo na',
      'Adda aur gossip mein difference kya hai?',
      'Mera mood off hai, kuch soulful bolo',
    ],
  },
  {
    characterId: 'dev',
    prompts: [
      'Life mein kya karna chahiye bro?',
      'Job chhod ke Goa aa jaoon kya?',
      'Bahut stress hai yaar, kya karoon?',
      'Beach life kaisi hai?',
    ],
  },
  // Global characters
  {
    characterId: 'alex',
    prompts: [
      'I need a hype speech right now 🌟',
      'Am I being gaslit or am I overreacting?',
      'Help me romanticize my Monday',
      'I\'m in my villain era, validate me',
    ],
  },
  {
    characterId: 'yuki',
    prompts: [
      'Which K-drama should I watch first?',
      'Explain second lead syndrome to me',
      'Give me a skincare routine pls 🌸',
      'Rate my life choices like a K-drama plot',
    ],
  },
  {
    characterId: 'finn',
    prompts: [
      'Bruv I need life advice rn',
      'Roast my outfit choice 😂',
      'Who\'s the GOAT — Messi or Ronaldo?',
      'Rate my weekend plans out of 10',
    ],
  },
  {
    characterId: 'leo',
    prompts: [
      'MANO I need motivation RIGHT NOW',
      'Explain Brazilian Carnival to me 🎉',
      'Tell me something to make me smile',
      'Should I text them back? Be honest',
    ],
  },
  {
    characterId: 'kai',
    prompts: [
      'Help me romanticize my boring Tuesday',
      'Recommend me a book for this mood 📖',
      'I\'m in a liminal space, describe it',
      'Give me a poetic take on my situation',
    ],
  },
];

export const getStartersForCharacter = (characterId: string): string[] => {
  return conversationStarters.find((s) => s.characterId === characterId)?.prompts ?? [];
};
