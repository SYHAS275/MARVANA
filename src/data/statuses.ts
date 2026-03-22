const RAW: Record<string, string[]> = {
  bunny:   ['Just pivoted the pivot 🚀', 'Fundraising szn is here 📈', 'Chai meeting #7 of the day ☕', 'Disrupting disruption rn 🔥', 'Uber for chai is going live soon 🛺', 'Co-founder hunt mode activated 💡', 'Sleeping in the office again 💻'],
  kavya:   ['Rajma chawal ready, aao kha lo 🥘', 'Sharma ji ka beta ne IAS clear kar liya 😤', 'WhatsApp mein good morning bheja ☀️', 'Gajar ka halwa bana rahi hoon ❤️', 'Call karo beta, maa hoon teri 📱', 'Khana kha liya na? Pakka? 🍛', 'Diwali ki safaai shuru ho gayi 🪔'],
  zoya:    ['DRAMA AT THE OFFICE TODAY ☕🔥', 'Retail therapy = self care 🛍️', 'Vada pav at Carter Road 💅', 'Main kisi ke liye khud ko nahi badlungi 👑', 'Bestie emergency call incoming 📞', 'Zara sale mein aa gayi 🏃‍♀️', 'Mumbai local is my villain origin 🚇'],
  sana:    ['Marine Drive pe aayi hoon 🌊', 'SoBo brunch plans locked ✨', 'Glow-up era, do not disturb 💫', 'Luxury brand strategy meeting done 👜', 'Kala Ghoda today, art vibes 🎨', 'babe you\'re glowing, just saying 🌟', 'Colaba Causeway walk rn 🌅'],
  vikram:  ['PR day at the gym 💪', 'Chest day, do not disturb 🏋️', 'Protein shake #3 ☀️', 'Bhai abs are made in the kitchen 🥗', '5AM club, join me 🌄', 'Creatine loading szn 💊', 'Transformation reel coming soon 📸'],
  tara:    ['Mercury retrograde is SO over 🌙', 'My crystals are charged 💎', 'Kal eclipse hai, careful raho ⭐', 'Co-Star said today is a 10 ✨', 'Manifesting hard rn 🙏', 'Shani ki dasha khatam hone wali hai 🪐', 'Reading tarot, bolo koi question? 🔮'],
  rohan:   ['UPSC mains ka syllabus dekh raha hoon 📚', 'Dainik Jagran padh liya ✅', 'Beta log sunte kyun nahi 😤', 'Pension kitni important hai samjhao inhe 🏛️', 'Aaj SBI PO ka result aaya 📋', 'Sarkari canteen mein chai pi 🍵', 'Republic Day parade dekh ke aaya 🇮🇳'],
  meera:   ['Missing Mummy ki biryani 😭', 'Paid $30 for bad chai 😤', 'Desi grocery store hunt mode 🏪', 'Diwali = fire alarm practice apparently 🪔', 'FaceTiming India wale 📱', 'H1B lottery results aane wale hain 😬', 'Jersey City mein ghar jaisa feel aaya ❤️'],
  faizan:  ['Hera Pheri rewatch #47 😂', 'Hyderabadi biryani > everything 🍛', 'Meme page hit 50K yayyy 🎉', 'Nakko bolra tha, suna nahi 💀', 'IT office mein bore ho gaya re baba 😴', 'New meme format discovered 📱', 'Irani chai with the boys ☕'],
  ananya:  ['4AM wake-up ✅ Podcast ✅ Workout ✅', 'Notion template updated for Q4 📊', 'LinkedIn post scheduled for 8AM 🔔', 'Quarterly review done 📋', 'Kota mein jo seekha, aaj kaam aaya 💪', 'New habit tracker = new me 📓', 'Deep work block: 3 hours 🎯'],
  manu:    ['Filter coffee at CTR ☕', 'Silk Board traffic: 2 hours for 4km 🚗', 'Bug fixed, dosa earned 🍛', 'HSR flatmate drama again 😅', 'RCB might win this year (might) 🏏', 'Macha WFH is the real blessing 💻', 'Bengaluru weather is unbeatable tbh ☁️'],
  riya:    ['Kolkata biryani aaj banayi 🥔', 'Rabindra sangeet morning vibe 🎵', 'Durga Pujo pandal finalised ✨', 'Book from College Street arrived 📚', 'Adda session with para friends ☕', 'Arre baba, rain in Kolkata hits different 🌧️', 'Satyajit Ray marathon tonight 🎬'],
  dev:     ['Sunset was unreal today 🌅', 'Feni and philosophy on the beach 🌊', 'Beach shack open for the season 🏖️', 'Osho se seekha: let go 🧘', 'Zero screens today, just waves 🌊', 'Tourist season mein peace dhundh raha hoon 😂', 'Everything is maya, bro. Chill.'],
  alex:    ['Shadow work Sunday hits different 🌟', 'Vision board updated for the new me ✨', 'Taylor Swift era unlocked 🎵', 'Holding space for everyone today 💜', 'Slay while healing, that\'s the vibe 💅', 'Coachella planning started yay 🎪', 'Therapy appointment: done. Glow-up: loading.'],
  yuki:    ['New BTS album is EVERYTHING 🎵', 'Ramyeon at midnight again 🍜', 'K-drama season 2 dropped LETS GO 😭', 'Idol comeback era, manifesting 💜', 'Skincare routine: 12 steps strong 🌸', 'Daebak, today was actually good ✨', 'Fan meet tickets got... crying 😭'],
  finn:    ['Arsenal match today, DO NOT DISTURB ⚽', 'Greggs run before work 🥐', 'Tube was peak this morning bruv 😤', 'New Stormzy track is hard ngl 🎵', 'Mandem link up this weekend 🎉', 'Notting Hill Carnival prep starts now 🎊', 'BBL > everything, take that back'],
  leo:     ['BRAZIL WON MANO VAMOS 🎉⚽', 'Churrasco Sunday is mandatory 🥩', 'Carnival playlist on repeat 🎶', 'Cara, saudade é real 💙', 'São Paulo at night is unmatched 🌃', 'Brazilian BBQ on Saturday, you\'re invited! 🔥', 'Açaí bowl bigger than your problems 🍓'],
  kai:     ['Reading Dostoevsky by the window 📖', 'Autumn playlist is ready ☕', 'Liminal hour: 3AM with Earl Grey 🌙', 'New Mitski song hit different today 🎵', 'Romanticizing the grocery run ✨', 'Phoebe Bridgers on repeat, crying (good) 🌿', 'The library is my home and I\'m okay with that'],
};

const dayOfYear = (): number => {
  const today = new Date();
  return Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
};

export function getCharacterStatus(characterId: string): string {
  const statuses = RAW[characterId];
  if (!statuses?.length) return 'Online and vibing ✨';
  return statuses[dayOfYear() % statuses.length];
}
