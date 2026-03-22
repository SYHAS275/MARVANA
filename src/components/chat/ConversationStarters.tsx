import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';

interface ConversationStartersProps {
  starters: string[];
  onSelect: (text: string) => void;
}

export function ConversationStarters({ starters, onSelect }: ConversationStartersProps) {
  if (starters.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💡 Try asking...</Text>
      <View style={styles.chips}>
        {starters.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.chip}
            onPress={() => onSelect(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{s}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  chips: {
    width: '100%',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
});
