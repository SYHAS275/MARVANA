import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

const QUICK_REACTIONS = ['❤️', '😂', '🔥', '💀', '👀', '🥲'];

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function DMReactionPicker({ visible, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.picker}>
            {QUICK_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiBtn}
                onPress={() => { onSelect(emoji); onClose(); }}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  picker: {
    flexDirection: 'row', gap: 6, backgroundColor: '#1a1a1a',
    borderRadius: 24, padding: 10,
    borderWidth: 1, borderColor: '#333',
  },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
});
