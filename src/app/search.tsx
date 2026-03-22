import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useChatStore } from '../store/useChatStore';
import { getCharacter } from '../data/characters';
import { Avatar } from '../components/common/Avatar';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface SearchResult {
  chatId: string;
  messageId: string;
  content: string;
  timestamp: number;
  charName: string;
  charColor: string;
  charEmoji: string;
  charImage: any;
  isUser: boolean;
  chatTitle: string;
}

function highlight(text: string, query: string): React.ReactElement {
  if (!query) return <Text>{text}</Text>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <Text style={{ color: colors.textSecondary }}>{text}</Text>;
  return (
    <Text style={{ color: colors.textSecondary }}>
      {text.slice(0, idx)}
      <Text style={{ color: colors.textPrimary, fontWeight: '700', backgroundColor: '#A855F733' }}>
        {text.slice(idx, idx + query.length)}
      </Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const allMessages = useChatStore((s) => s.messages);
  const chats = useChatStore((s) => s.chats);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: SearchResult[] = [];
    for (const [chatId, msgs] of Object.entries(allMessages)) {
      const chat = chats[chatId];
      if (!chat) continue;
      const char = getCharacter(chat.characterIds[0]);
      const chatTitle = chat.type === 'group' ? chat.title : (char?.name || 'Chat');
      for (const msg of msgs) {
        if (msg.content.toLowerCase().includes(q)) {
          out.push({
            chatId,
            messageId: msg.id,
            content: msg.content,
            timestamp: msg.timestamp,
            charName: char?.name || '?',
            charColor: char?.avatarColor || '#A855F7',
            charEmoji: char?.avatarEmoji || '🤖',
            charImage: char?.avatarImage,
            isUser: msg.senderId === 'user',
            chatTitle,
          });
        }
      }
    }
    return out.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  }, [query, allMessages, chats]);

  const goToChat = (r: SearchResult) => {
    router.push(`/chat/${r.chatId}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search messages..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Type at least 2 characters to search</Text>
        </View>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No messages found</Text>
          <Text style={styles.emptySub}>Try different keywords</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(r) => r.messageId}
        contentContainerStyle={styles.list}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={styles.result} onPress={() => goToChat(r)} activeOpacity={0.75}>
            <Avatar color={r.charColor} emoji={r.charEmoji} image={r.charImage} size={44} />
            <View style={styles.resultBody}>
              <View style={styles.resultTop}>
                <Text style={styles.resultChar}>{r.chatTitle}</Text>
                <Text style={styles.resultTime}>{formatTime(r.timestamp)}</Text>
              </View>
              <Text style={styles.resultSender}>{r.isUser ? 'You' : r.charName}</Text>
              <Text numberOfLines={2} style={styles.resultMsg}>
                {highlight(r.content, query.trim())}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={styles.resultCount}>{results.length} result{results.length !== 1 ? 's' : ''}</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgElevated, borderRadius: 14,
    paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 16 },
  hint: { padding: 24, alignItems: 'center' },
  hintText: { color: colors.textMuted, fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  emptySub: { fontSize: 14, color: colors.textMuted },
  list: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 40 },
  resultCount: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 10 },
  result: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  resultBody: { flex: 1, gap: 2 },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultChar: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  resultTime: { fontSize: 11, color: colors.textMuted },
  resultSender: { fontSize: 12, color: '#A855F7', fontWeight: '600' },
  resultMsg: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
});
