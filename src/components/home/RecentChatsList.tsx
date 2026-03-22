import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Chat } from '../../types';
import { getCharacter } from '../../data/characters';
import { Avatar } from '../common/Avatar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface RecentChatsListProps {
  chats: Chat[];
  onChatPress: (chat: Chat) => void;
}

export function RecentChatsList({ chats, onChatPress }: RecentChatsListProps) {
  if (chats.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent chats</Text>
      {chats.slice(0, 5).map((chat) => {
        const char = getCharacter(chat.characterIds[0]);
        const isGroup = chat.type === 'group';
        return (
          <TouchableOpacity
            key={chat.id}
            style={styles.item}
            onPress={() => onChatPress(chat)}
            activeOpacity={0.7}
          >
            {char && !isGroup ? (
              <Avatar color={char.avatarColor} emoji={char.avatarEmoji} image={char.avatarImage} size={44} />
            ) : (
              <View style={[styles.groupAvatar]}>
                <Text style={{ fontSize: 20 }}>👥</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>
                {isGroup ? chat.title : char?.name || 'Chat'}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {chat.lastMessage || 'Start chatting...'}
              </Text>
            </View>
            {chat.lastMessageTime && (
              <Text style={styles.time}>
                {formatTime(chat.lastMessageTime)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  preview: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    ...typography.small,
    color: colors.textMuted,
  },
});
