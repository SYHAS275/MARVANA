import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { spacing } from '../../theme/spacing';
import { getCharacter } from '../../data/characters';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onRegenerate?: () => void;
  showSenderName?: boolean;
  getCharacterColor?: (senderId: string) => string | undefined;
  bubbleColor?: string;
}

export function MessageList({
  messages,
  isTyping,
  onReact,
  onRegenerate,
  showSenderName,
  getCharacterColor,
  bubbleColor,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  const lastAIIndex = [...messages].reverse().findIndex((m) => m.senderId !== 'user');
  const lastAIMsgId = lastAIIndex >= 0 ? messages[messages.length - 1 - lastAIIndex]?.id : null;

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={16}
      renderItem={({ item }) => {
        const isUser = item.senderId === 'user';
        const char = !isUser ? getCharacter(item.senderId) : null;
        return (
          <MessageBubble
            message={item}
            isUser={isUser}
            senderName={showSenderName && char ? char.name : undefined}
            senderColor={getCharacterColor?.(item.senderId)}
            onReact={onReact ? (emoji) => onReact(item.id, emoji) : undefined}
            onRegenerate={item.id === lastAIMsgId ? onRegenerate : undefined}
            isLastAI={item.id === lastAIMsgId}
            bubbleColor={bubbleColor}
          />
        );
      }}
      ListFooterComponent={isTyping ? <TypingIndicator /> : null}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
});
