import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Animated, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../store/useChatStore';
import { useUserStore } from '../../store/useUserStore';
import { getCharacter } from '../../data/characters';
import { Avatar } from '../../components/common/Avatar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Chat } from '../../types';
import { fetchDMRooms, fetchProfile, DMRoom } from '../../services/supabase';
import { StreakModal } from '../../components/common/StreakModal';
import { WeeklyWrapped, shouldShowWrapped, getWeekLabel, getWeekKey, WrappedStats } from '../../components/common/WeeklyWrapped';
import { formatCoins } from '../../utils/coins';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}
const hapticLight  = () => { try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Light);  } catch {} };
const hapticMedium = () => { try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Medium); } catch {} };

interface DMRoomWithUser extends DMRoom {
  otherName: string;
  otherEmail: string;
}

function UserAvatar({ name, size = 52 }: { name: string; size?: number }) {
  const letter = (name || '?')[0].toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View style={[styles.dmAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},60%,40%)` }]}>
      <Text style={[styles.dmAvatarLetter, { fontSize: size * 0.38 }]}>{letter}</Text>
    </View>
  );
}

export default function ChatsScreen() {
  const router        = useRouter();
  const getSortedChats = useChatStore((s) => s.getSortedChats);
  const deleteChat    = useChatStore((s) => s.deleteChat);
  const togglePin     = useChatStore((s) => s.togglePin);
  const pinnedChatIds = useChatStore((s) => s.pinnedChatIds);
  const authSession   = useUserStore((s) => s.authSession);
  const myId          = useUserStore((s) => s.userId);
  const streakCount   = useUserStore((s) => s.streakCount);
  const coins         = useUserStore((s) => s.coins);
  const pendingStreakMilestone = useUserStore((s) => s.pendingStreakMilestone);
  const clearStreakMilestone   = useUserStore((s) => s.clearStreakMilestone);

  const chats  = getSortedChats();
  const [search, setSearch] = useState('');
  const [dmRooms, setDmRooms] = useState<DMRoomWithUser[]>([]);
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedStats, setWrappedStats] = useState<WrappedStats | null>(null);
  const allMessages = useChatStore((s) => s.messages);

  // Show weekly wrapped on Sundays
  useEffect(() => {
    const lastWrapped = null; // TODO: persist this key
    if (shouldShowWrapped(lastWrapped)) {
      const totalMessages = Object.values(allMessages).reduce((sum, msgs) => sum + msgs.length, 0);
      const topChar = Object.entries(allMessages).sort((a, b) => b[1].length - a[1].length)[0];
      setWrappedStats({
        totalMessages,
        topCharacterId: topChar ? topChar[0] : null,
        streakCount,
        coinsEarned: coins,
        weekLabel: getWeekLabel(new Date()),
      });
      setShowWrapped(true);
    }
  }, []);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const loadDMRooms = useCallback(async () => {
    if (!authSession || !myId) return;
    try {
      const rooms = await fetchDMRooms(authSession.accessToken, myId);
      // Fetch other user's profile for each room
      const enriched = await Promise.all(
        rooms.map(async (room) => {
          const otherId = room.user1_id === myId ? room.user2_id : room.user1_id;
          try {
            const profile = await fetchProfile(authSession.accessToken, otherId);
            return {
              ...room,
              otherName: profile?.name || profile?.email || 'Unknown',
              otherEmail: profile?.email || '',
            } as DMRoomWithUser;
          } catch {
            return { ...room, otherName: 'User', otherEmail: '' } as DMRoomWithUser;
          }
        })
      );
      setDmRooms(enriched);
    } catch {
      // silent
    }
  }, [authSession, myId]);

  useEffect(() => {
    loadDMRooms();
    const interval = setInterval(loadDMRooms, 10000);
    return () => clearInterval(interval);
  }, [loadDMRooms]);

  const filtered = search.trim()
    ? chats.filter((c) => {
        const char = getCharacter(c.characterIds[0]);
        const name = c.type === 'group' ? c.title : (char?.name || '');
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : chats;

  const filteredDMs = search.trim()
    ? dmRooms.filter((r) => r.otherName.toLowerCase().includes(search.toLowerCase()))
    : dmRooms;

  const handlePress = (chat: Chat) => {
    hapticLight();
    if (chat.type === 'group') router.push(`/group/${chat.id}`);
    else router.push(`/chat/${chat.id}`);
  };

  const handleLongPress = (chat: Chat) => {
    hapticMedium();
    const isPinned = pinnedChatIds.includes(chat.id);
    const char = getCharacter(chat.characterIds[0]);
    const name = chat.type === 'group' ? chat.title : (char?.name || 'Chat');
    Alert.alert(name, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isPinned ? '📌 Unpin' : '📌 Pin to top',
        onPress: () => { hapticLight(); togglePin(chat.id); },
      },
      {
        text: '🗑️ Delete',
        style: 'destructive',
        onPress: () => { hapticLight(); deleteChat(chat.id); },
      },
    ]);
  };

  const handleDelete = (id: string) => {
    hapticLight();
    swipeableRefs.current[id]?.close();
    deleteChat(id);
  };

  const renderRightActions = (id: string, progress: Animated.AnimatedInterpolation<number>) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ scale }] }]}>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(id)}>
          <Ionicons name="trash" size={22} color="#fff" />
          <Text style={styles.deleteTxt}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderAIChat = ({ item, index }: { item: Chat; index: number }) => {
    const char = getCharacter(item.characterIds[0]);
    const isGroup = item.type === 'group';
    const isPinned = pinnedChatIds.includes(item.id);
    const prevItem = filtered[index - 1];
    const prevPinned = prevItem ? pinnedChatIds.includes(prevItem.id) : true;
    const showUnpinnedHeader = !isPinned && prevPinned && !search && filtered.some((c) => pinnedChatIds.includes(c.id));

    return (
      <>
        {showUnpinnedHeader && <Text style={styles.sectionLabel}>Recent</Text>}
        <Swipeable
          ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
          renderRightActions={(progress) => renderRightActions(item.id, progress)}
          rightThreshold={80}
          friction={2}
          overshootRight={false}
        >
          <TouchableOpacity
            style={[styles.item, isPinned && styles.itemPinned]}
            onPress={() => handlePress(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.75}
            delayLongPress={350}
          >
            {char && !isGroup ? (
              <Avatar color={char.avatarColor} emoji={char.avatarEmoji} image={char.avatarImage} size={52} showOnline />
            ) : (
              <View style={styles.groupAvatar}><Text style={{ fontSize: 24 }}>👥</Text></View>
            )}
            <View style={styles.info}>
              <View style={styles.topRow}>
                <View style={styles.nameRow}>
                  {isPinned && <Text style={styles.pinIcon}>📌</Text>}
                  <Text style={styles.name} numberOfLines={1}>
                    {isGroup ? item.title : char?.name || 'Chat'}
                  </Text>
                </View>
                {item.lastMessageTime ? <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text> : null}
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage || 'Tap to start chatting...'}
              </Text>
            </View>
          </TouchableOpacity>
        </Swipeable>
        <View style={styles.separator} />
      </>
    );
  };

  const hasContent = filtered.length > 0 || filteredDMs.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statBadge}>🔥 {streakCount}d</Text>
            <Text style={styles.statBadge}>🪙 {formatCoins(coins)}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.composeBtn} onPress={() => router.push('/search' as any)}>
            <Ionicons name="search" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.composeBtn} onPress={() => router.push('/stories' as any)}>
            <Ionicons name="book-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.composeBtn} onPress={() => router.push('/people')}>
            <Ionicons name="people" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.composeBtn} onPress={() => router.push('/group/create')}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!hasContent ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>{search ? 'No results' : 'No chats yet'}</Text>
          {!search && <Text style={styles.emptySub}>Go to Discover to chat with characters, or tap 👥 to DM a friend</Text>}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* DM section */}
          {filteredDMs.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>💬 Direct Messages</Text>
              {filteredDMs.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={styles.item}
                  activeOpacity={0.75}
                  onPress={() => {
                    hapticLight();
                    const otherId = room.user1_id === myId ? room.user2_id : room.user1_id;
                    router.push(`/dm/${room.id}?otherId=${otherId}&otherName=${encodeURIComponent(room.otherName)}`);
                  }}
                >
                  <UserAvatar name={room.otherName} />
                  <View style={styles.info}>
                    <View style={styles.topRow}>
                      <Text style={styles.name} numberOfLines={1}>{room.otherName}</Text>
                      <Text style={styles.time}>{formatTime(new Date(room.created_at).getTime())}</Text>
                    </View>
                    <Text style={styles.preview} numberOfLines={1}>{room.otherEmail}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={styles.separator} />
            </>
          )}

          {/* AI / Group chats */}
          {filtered.length > 0 && (
            <>
              {filteredDMs.length > 0 && <Text style={styles.sectionLabel}>🤖 AI Characters</Text>}
              {!search && filtered.some((c) => pinnedChatIds.includes(c.id)) && (
                <Text style={styles.sectionLabel}>📌 Pinned</Text>
              )}
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={renderAIChat}
              />
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Streak milestone celebration */}
      <StreakModal
        visible={pendingStreakMilestone !== null}
        streakCount={pendingStreakMilestone ?? 0}
        onClose={clearStreakMilestone}
      />

      {/* Weekly Wrapped */}
      {wrappedStats && (
        <WeeklyWrapped
          visible={showWrapped}
          stats={wrappedStats}
          onClose={() => setShowWrapped(false)}
        />
      )}
    </SafeAreaView>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  statBadge: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: 4 },
  composeBtn: { padding: spacing.xs },
  searchWrapper: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgElevated, borderRadius: 12,
    paddingHorizontal: spacing.md, height: 38, gap: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, fontSize: 15 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 6,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: spacing.lg,
    gap: spacing.md, backgroundColor: colors.bg,
  },
  itemPinned: { backgroundColor: colors.bgCard },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 84 },
  groupAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  dmAvatar: { alignItems: 'center', justifyContent: 'center' },
  dmAvatarLetter: { color: '#fff', fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: spacing.sm },
  pinIcon: { fontSize: 11 },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  time: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  preview: { fontSize: 14, color: colors.textMuted, lineHeight: 19 },
  deleteAction: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8 },
  deleteBtn: {
    backgroundColor: colors.error, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    gap: 4, minWidth: 70, minHeight: 52,
  },
  deleteTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySub: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
