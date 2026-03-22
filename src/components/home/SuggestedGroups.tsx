import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { GroupScenario } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface SuggestedGroupsProps {
  scenarios: GroupScenario[];
  onScenarioPress: (scenario: GroupScenario) => void;
}

export function SuggestedGroups({ scenarios, onScenarioPress }: SuggestedGroupsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Group scenes</Text>
      <FlatList
        horizontal
        data={scenarios}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onScenarioPress(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xxl,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  list: {
    paddingHorizontal: spacing.xxl,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
});
