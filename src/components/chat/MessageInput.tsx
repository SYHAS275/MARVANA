import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  mentionableNames?: string[];
}

export function MessageInput({ onSend, disabled, mentionableNames = [] }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const hasText = text.trim().length > 0;

  const mentionMatch = text.match(/(?:^|\s)@([a-z0-9_]*)$/i);
  const mentionQuery = mentionMatch?.[1]?.toLowerCase() ?? null;
  const mentionCandidates = mentionQuery !== null
    ? mentionableNames.filter((name) => name.toLowerCase().startsWith(mentionQuery)).slice(0, 5)
    : [];

  const insertMention = (name: string) => {
    setText((prev) => prev.replace(/(?:^|\s)@([a-z0-9_]*)$/i, (match) => {
      const leadingSpace = match.startsWith(' ') ? ' ' : '';
      return `${leadingSpace}@${name} `;
    }));
  };

  return (
    <View style={styles.wrapper}>
      {mentionCandidates.length > 0 && (
        <View style={styles.mentionList}>
          {mentionCandidates.map((name) => (
            <TouchableOpacity key={name} style={styles.mentionItem} onPress={() => insertMention(name)}>
              <Text style={styles.mentionText}>@{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline={false}
            maxLength={500}
            editable={!disabled}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!hasText || disabled}
          activeOpacity={0.8}
        >
          {hasText && !disabled ? (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.sendBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          ) : (
            <View style={styles.sendBtnInactive}>
              <Ionicons name="mic-outline" size={20} color={colors.textMuted} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mentionList: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  mentionItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mentionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  inputRow: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    ...typography.chat,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    maxHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnInactive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
