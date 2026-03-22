import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Character } from '../../types';
import { Avatar } from '../common/Avatar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface CharacterCardProps {
  character: Character;
  onPress: () => void;
  onAvatarPress?: () => void;
}

export function CharacterCard({ character, onPress, onAvatarPress }: CharacterCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[character.avatarColor + '15', 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <TouchableOpacity onPress={onAvatarPress ?? onPress} activeOpacity={0.85}>
        <Avatar color={character.avatarColor} emoji={character.avatarEmoji} image={character.avatarImage} size={52} showOnline />
      </TouchableOpacity>
      <Text style={styles.name}>{character.name}</Text>
      <Text style={[styles.archetype, { color: character.avatarColor }]}>{character.archetype}</Text>
      <Text style={styles.city}>{character.city}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  archetype: {
    ...typography.small,
    fontWeight: '600',
    marginTop: 2,
  },
  city: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 10,
  },
});
