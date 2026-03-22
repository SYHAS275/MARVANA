import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const DEFAULT_CHIPS = [
  'Tell me more 👀',
  'That\'s interesting!',
  'Really? How so?',
  'OMG same 😭',
  'What do you mean?',
];

interface QuickRepliesProps {
  onSelect: (text: string) => void;
  characterArchetype?: string;
}

function getChips(archetype?: string): string[] {
  if (!archetype) return DEFAULT_CHIPS.slice(0, 3);
  const a = archetype.toLowerCase();
  if (a.includes('mom') || a.includes('kavya')) return ['Haha sahi bol rahi ho 😂', 'Aur bolo!', 'Main samjha/samjhi'];
  if (a.includes('bestie') || a.includes('zoya')) return ['GIRL SAME 💀', 'Nahi yaar seriously??', 'Chal na bata'];
  if (a.includes('gym') || a.includes('vikram')) return ['Bhai gains! 💪', 'Protein kya le raha hai?', 'Motivation de na'];
  if (a.includes('astro') || a.includes('tara')) return ['My sign?? 🔮', 'Mercury retrograde again?', 'Crystals recommend karo'];
  if (a.includes('startup') || a.includes('bunny')) return ['Pivot idea! 🚀', 'Funding kaise milega?', 'Bro sun ek idea hai'];
  if (a.includes('meme') || a.includes('faizan')) return ['Hera Pheri wala moment 😂', 'Bhai kya scene hai', 'Tension nakko le'];
  if (a.includes('philo') || a.includes('dev')) return ['Sab maya hai bro 🌊', 'Deep baat hai', 'Aur philosophy batao'];
  return DEFAULT_CHIPS.slice(0, 3);
}

export function QuickReplies({ onSelect, characterArchetype }: QuickRepliesProps) {
  const chips = getChips(characterArchetype);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip}
          style={styles.chip}
          onPress={() => onSelect(chip)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{chip}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  chipText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
