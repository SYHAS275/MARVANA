import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Animated, TouchableOpacity, View, Text, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { getCharacter } from '../../data/characters';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onRegenerate?: () => void;
  onReply?: (message: Message) => void;
  showSenderName?: boolean;
  getCharacterColor?: (senderId: string) => string | undefined;
  bubbleColor?: string;
}

export function MessageList({
  messages,
  isTyping,
  onReact,
  onRegenerate,
  onReply,
  showSenderName,
  getCharacterColor,
  bubbleColor,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const shouldShow = distanceFromBottom > 300;
    setShowScrollBtn(shouldShow);
    Animated.timing(scrollBtnOpacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [scrollBtnOpacity]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

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
    <View style={styles.container}>
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
              onReply={onReply}
              isLastAI={item.id === lastAIMsgId}
              bubbleColor={bubbleColor}
            />
          );
        }}
        ListEmptyComponent={
          !isTyping ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>Say hello!</Text>
            </View>
          ) : null
        }
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />
      <Animated.View
        style={[styles.scrollToBottomBtn, { opacity: scrollBtnOpacity }]}
        pointerEvents={showScrollBtn ? 'auto' : 'none'}
      >
        <TouchableOpacity onPress={scrollToBottom} activeOpacity={0.8} style={styles.scrollToBottomInner}>
          <Ionicons name="chevron-down" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  scrollToBottomBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: colors.textMuted },
  scrollToBottomInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
