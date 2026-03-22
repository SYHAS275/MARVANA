import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const REACTIONS = ['😂', '❤️', '🔥', '😭', '👍'];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onReact, onClose }: ReactionPickerProps) {
  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      <View style={styles.picker}>
        {REACTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={styles.button}
            onPress={() => {
              onReact(emoji);
              onClose();
            }}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000050',
  },
  picker: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    padding: spacing.sm,
  },
  emoji: {
    fontSize: 28,
  },
});
