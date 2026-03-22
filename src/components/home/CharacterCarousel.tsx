import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Character } from '../../types';
import { CharacterCard } from './CharacterCard';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface CharacterCarouselProps {
  characters: Character[];
  onCharacterPress: (character: Character) => void;
}

export function CharacterCarousel({ characters, onCharacterPress }: CharacterCarouselProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start chatting</Text>
      <FlatList
        horizontal
        data={characters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CharacterCard character={item} onPress={() => onCharacterPress(item)} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
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
});
