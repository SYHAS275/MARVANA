import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';

// Haptics — graceful fallback
let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}
const hapticMedium = () => { try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Medium); } catch {} };

import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Message } from '../../types';
import { getCharacter } from '../../data/characters';
import { Avatar } from '../common/Avatar';
import { ReactionPicker } from './ReactionPicker';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { speakWithSarvam, stopSarvamAudio } from '../../services/sarvam';
import { useUserStore } from '../../store/useUserStore';

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  showAvatar?: boolean;
  senderName?: string;
  senderColor?: string;
  onReact?: (emoji: string) => void;
  onRegenerate?: () => void;
  isLastAI?: boolean;
  bubbleColor?: string; // chat theme support
}

function formatMsgTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  message,
  isUser,
  showAvatar = true,
  senderName,
  senderColor,
  onReact,
  onRegenerate,
  isLastAI,
  bubbleColor,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const preferredLanguage = useUserStore((s) => s.preferredLanguage) || 'en-IN';
  const character = !isUser ? getCharacter(message.senderId) : null;
  const hasContent = message.content.trim().length > 0;
  const visibleContent = hasContent ? message.content : !message.isStreaming ? '...' : '';

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSarvamAudio();
      setIsSpeaking(false);
    } else {
      speakWithSarvam(
        message.content,
        preferredLanguage,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
      );
    }
  };

  const bubbleContent = (
    <>
      {senderName && !isUser && (
        <Text style={[styles.senderName, senderColor ? { color: senderColor } : {}]}>
          {senderName}
        </Text>
      )}
      <Text style={[styles.text, isUser && styles.textUser]}>
        {visibleContent}
        {message.isStreaming && <Text style={styles.cursor}>▋</Text>}
      </Text>
      <View style={styles.metaRow}>
        <Text style={[styles.time, isUser && styles.timeUser]}>
          {formatMsgTime(message.timestamp)}
        </Text>
        {isUser && (
          <Ionicons
            name={message.isStreaming ? 'checkmark' : 'checkmark-done'}
            size={13}
            color={message.isStreaming ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)'}
            style={{ marginLeft: 3 }}
          />
        )}
        {/* Voice button for AI messages */}
        {!isUser && hasContent && !message.isStreaming && (
          <TouchableOpacity onPress={handleSpeak} style={styles.speakBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isSpeaking ? 'stop-circle' : 'volume-medium-outline'}
              size={13}
              color={isSpeaking ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {message.reactions.length > 0 && (
        <View style={styles.reactions}>
          {Object.entries(
            message.reactions.reduce<Record<string, number>>((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {})
          ).map(([emoji, count]) => (
            <View key={emoji} style={styles.reactionBubble}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <>
      <Animated.View
        entering={FadeInDown.duration(160).springify().damping(20)}
        style={[styles.row, isUser && styles.rowUser]}
      >
        {!isUser && showAvatar && character && (
          <View style={styles.avatarCol}>
            <Avatar color={character.avatarColor} emoji={character.avatarEmoji} image={character.avatarImage} size={32} />
          </View>
        )}
        {!isUser && showAvatar && !character && <View style={{ width: 40 }} />}
        {!isUser && !showAvatar && <View style={{ width: 40 }} />}

        <Pressable
          style={[styles.bubbleWrapper, isUser && styles.bubbleWrapperUser]}
          onLongPress={() => { if (!isUser && onReact) { hapticMedium(); setShowReactions(true); } }}
        >
          {isUser ? (
            <LinearGradient
              colors={bubbleColor ? [bubbleColor, bubbleColor + 'CC'] : [colors.gradientStart, colors.gradientEnd]}
              style={styles.bubble}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {bubbleContent}
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.bubbleAI]}>
              {bubbleContent}
            </View>
          )}
        </Pressable>
      </Animated.View>

      {isLastAI && onRegenerate && !message.isStreaming && (
        <TouchableOpacity onPress={onRegenerate} style={styles.regenerateRow}>
          <Ionicons name="refresh-outline" size={13} color={colors.textMuted} />
          <Text style={styles.regenerateText}>Regenerate</Text>
        </TouchableOpacity>
      )}

      {showReactions && onReact && (
        <ReactionPicker
          onReact={onReact}
          onClose={() => setShowReactions(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    gap: spacing.xs,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatarCol: {
    marginBottom: 2,
  },
  bubbleWrapper: {
    maxWidth: '78%',
  },
  bubbleWrapperUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleAI: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  text: {
    ...typography.chat,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  textUser: {
    color: '#fff',
  },
  cursor: {
    color: 'rgba(255,255,255,0.7)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 4,
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
  },
  timeUser: {
    color: 'rgba(255,255,255,0.55)',
  },
  speakBtn: {
    marginLeft: 2,
  },
  reactions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  regenerateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 56,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  regenerateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
