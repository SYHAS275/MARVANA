import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const MOODS = ['vibing ✨', 'chatty 💬', 'hyped 🔥', 'chill 😌', 'dramatic 🎭'] as const;

interface CharacterMoodBadgeProps {
  characterName: string;
}

export function CharacterMoodBadge({ characterName }: CharacterMoodBadgeProps) {
  // Pick a pseudo-random mood based on time (changes every few minutes)
  const idx = Math.floor(Date.now() / 300000) % MOODS.length;
  const mood = MOODS[idx];

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{mood}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  text: {
    ...typography.small,
    color: colors.primary,
  },
});
