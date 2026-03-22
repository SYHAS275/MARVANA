import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../store/useUserStore';
import {
  searchUsers, getSuggestedUsers, getOrCreateDMRoom, followUser, unfollowUser,
  checkFollowing, reportUser, ReportReason, UserProfileRow,
} from '../services/supabase';
import { colors } from '../theme/colors';

const RECENT_KEY = 'daze:recent_searches';
const MAX_RECENT = 8;

// Simulated online status — within 10 min of now (hashes user id for determinism in dev)
function isOnlineNow(userId: string) {
  return userId.charCodeAt(0) % 3 === 0;
}

function UserAvatar({ name, size = 44, online = false }: { name: string; size?: number; online?: boolean }) {
  const letter = (name || '?')[0].toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},55%,38%)`, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{letter}</Text>
      </View>
      {online && (
        <View style={[onlineDot.dot, { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, bottom: 0, right: 0 }]} />
      )}
    </View>
  );
}

const onlineDot = StyleSheet.create({
  dot: {
    position: 'absolute',
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.bg,
  },
});

function UserRow({ user, myId, accessToken, onDM, onCall, onReport, onBlock, showDivider = true }: {
  user: UserProfileRow; myId: string; accessToken: string;
  onDM: (u: UserProfileRow) => void;
  onCall: (u: UserProfileRow, type: 'voice' | 'video') => void;
  onReport: (u: UserProfileRow) => void;
  onBlock: (u: UserProfileRow) => void;
  showDivider?: boolean;
}) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const online = isOnlineNow(user.id);

  useEffect(() => {
    checkFollowing(accessToken, myId, user.id)
      .then(setFollowing)
      .catch(() => setFollowing(false));
  }, [user.id]);

  const toggleFollow = async () => {
    if (following === null) return;
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(accessToken, myId, user.id);
        setFollowing(false);
      } else {
        await followUser(accessToken, myId, user.id);
        setFollowing(true);
      }
    } catch {} finally { setLoading(false); }
  };

  return (
    <>
      <View style={row.wrap}>
        <UserAvatar name={user.name || user.email || '?'} size={44} online={online} />
        <View style={row.info}>
          <View style={row.nameRow}>
            <Text style={row.name} numberOfLines={1}>{user.name || 'Unnamed'}</Text>
            {online && <Text style={row.onlineLabel}>• Active now</Text>}
          </View>
          <Text style={row.handle} numberOfLines={1}>{user.email}</Text>
        </View>
        <View style={row.actions}>
          <TouchableOpacity style={row.iconBtn} onPress={() => onDM(user)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={row.iconBtn} onPress={() => onCall(user, 'voice')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="call-outline" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={row.iconBtn} onPress={() => onCall(user, 'video')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="videocam-outline" size={17} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[row.followBtn, following && row.followingBtn]}
            onPress={toggleFollow}
            disabled={loading || following === null}
          >
            {loading ? (
              <ActivityIndicator size="small" color={following ? colors.textPrimary : '#fff'} />
            ) : following ? (
              <Text style={row.followingText}>Following</Text>
            ) : (
              <Text style={row.followText}>Follow</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => Alert.alert(user.name || 'User', '', [
              { text: '🚩 Report', onPress: () => onReport(user) },
              { text: '🚫 Block', style: 'destructive', onPress: () => onBlock(user) },
              { text: 'Cancel', style: 'cancel' },
            ])}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
      {showDivider && <View style={row.divider} />}
    </>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16, gap: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  onlineLabel: { fontSize: 12, color: '#22C55E', fontWeight: '500' },
  handle: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  followBtn: {
    backgroundColor: colors.primary, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
    minWidth: 84, alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border,
  },
  followText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  followingText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
});

export default function PeopleScreen() {
  const router = useRouter();
  const authSession = useUserStore((s) => s.authSession);
  const myId = useUserStore((s) => s.userId);
  const blockUserAction = useUserStore((s) => s.blockUser);
  const isBlocked = useUserStore((s) => s.isBlocked);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const [suggested, setSuggested] = useState<UserProfileRow[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<UserProfileRow[]>([]);

  const inputRef = useRef<TextInput>(null);
  const cancelWidth = useRef(new Animated.Value(0)).current;

  // Load suggested + recent on mount
  useEffect(() => {
    if (!authSession || !myId) return;
    setSuggestedLoading(true);
    getSuggestedUsers(authSession.accessToken, myId)
      .then((users) => setSuggested(users.filter((u) => !isBlocked(u.id))))
      .catch(() => {})
      .finally(() => setSuggestedLoading(false));

    AsyncStorage.getItem(RECENT_KEY)
      .then((val) => val && setRecentSearches(JSON.parse(val)))
      .catch(() => {});
  }, []);

  const saveRecent = async (user: UserProfileRow) => {
    const updated = [user, ...recentSearches.filter((u) => u.id !== user.id)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const removeRecent = async (userId: string) => {
    const updated = recentSearches.filter((u) => u.id !== userId);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim() || !authSession) { setResults([]); return; }
    setLoading(true);
    setError('');
    try {
      const users = await searchUsers(authSession.accessToken, q);
      setResults(users.filter((u) => u.id !== myId && !isBlocked(u.id)));
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authSession, myId, isBlocked]);

  const handleFocus = () => {
    setFocused(true);
    Animated.spring(cancelWidth, { toValue: 1, useNativeDriver: false, tension: 120, friction: 14 }).start();
  };

  const handleCancel = () => {
    setQuery('');
    setResults([]);
    setFocused(false);
    inputRef.current?.blur();
    Animated.spring(cancelWidth, { toValue: 0, useNativeDriver: false, tension: 120, friction: 14 }).start();
  };

  const handleReport = (user: UserProfileRow) => {
    Alert.alert('Report User', 'Why are you reporting this user?', [
      { text: 'Harassment', onPress: () => void submitReport(user.id, 'harassment') },
      { text: 'Hate Speech', onPress: () => void submitReport(user.id, 'hate_speech') },
      { text: 'Spam', onPress: () => void submitReport(user.id, 'spam') },
      { text: 'Fake Account', onPress: () => void submitReport(user.id, 'fake_account') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitReport = async (reportedId: string, reason: ReportReason) => {
    if (!authSession || !myId) return;
    try {
      await reportUser(authSession.accessToken, myId, reportedId, reason);
      Alert.alert('Reported', 'Thank you. Our team will review this within 24 hours.');
    } catch {
      Alert.alert('Error', 'Could not submit report. Try again.');
    }
  };

  const handleBlock = (user: UserProfileRow) => {
    Alert.alert('Block User', `Block ${user.name || 'this user'}?`, [
      {
        text: 'Block', style: 'destructive', onPress: async () => {
          await blockUserAction(user.id);
          setResults((prev) => prev.filter((u) => u.id !== user.id));
          setSuggested((prev) => prev.filter((u) => u.id !== user.id));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openDM = async (user: UserProfileRow) => {
    if (!authSession) return;
    try {
      const roomId = await getOrCreateDMRoom(authSession.accessToken, myId, user.id);
      router.push(`/dm/${roomId}?otherId=${user.id}&otherName=${encodeURIComponent(user.name || user.email || 'User')}`);
    } catch {
      setError('Could not open chat. Try again.');
    }
  };

  const openCall = (user: UserProfileRow, type: 'voice' | 'video') => {
    router.push(
      `/call/${user.id}?name=${encodeURIComponent(user.name || user.email || 'User')}&type=${type}`
    );
  };

  const handleSelectUser = (user: UserProfileRow) => {
    saveRecent(user);
    openDM(user);
  };

  const rowProps = (user: UserProfileRow, idx: number, arr: UserProfileRow[]) => ({
    user,
    myId,
    accessToken: authSession!.accessToken,
    onDM: (u: UserProfileRow) => { saveRecent(u); openDM(u); },
    onCall: (u: UserProfileRow, type: 'voice' | 'video') => { saveRecent(u); openCall(u, type); },
    onReport: handleReport,
    onBlock: handleBlock,
    showDivider: idx < arr.length - 1,
  });

  const showSearch = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find People</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={search}
              onFocus={handleFocus}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
              underlineColorAndroid="transparent"
              selectionColor={colors.primary}
            />
            {loading ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : query.length > 0 ? (
              <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={styles.clearBtn}>
                  <Ionicons name="close" size={10} color={colors.bg} />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          <Animated.View style={{
            overflow: 'hidden',
            width: cancelWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 72] }) as any,
            opacity: cancelWidth,
          }}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Search results */}
        {showSearch ? (
          results.length === 0 && !loading ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsTitle}>No results for</Text>
              <Text style={styles.noResultsQuery}>"{query}"</Text>
              <Text style={styles.noResultsSub}>Try a different name or email address.</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(u) => u.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) =>
                authSession ? <UserRow key={item.id} {...rowProps(item, index, results)} /> : null
              }
            />
          )
        ) : (
          /* Default state: recent + suggested */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                  <TouchableOpacity onPress={clearAllRecent} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.sectionAction}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                {recentSearches.map((user) => (
                  <View key={user.id} style={styles.recentRow}>
                    <TouchableOpacity style={styles.recentLeft} onPress={() => handleSelectUser(user)}>
                      <View style={styles.recentAvatarWrap}>
                        <UserAvatar name={user.name || user.email || '?'} size={40} online={isOnlineNow(user.id)} />
                        <View style={styles.recentIconBadge}>
                          <Ionicons name="time" size={10} color="#fff" />
                        </View>
                      </View>
                      <View>
                        <Text style={styles.recentName}>{user.name || 'Unnamed'}</Text>
                        <Text style={styles.recentHandle}>{user.email}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeRecent(user.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Suggested People */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Suggested</Text>
              </View>
              {suggestedLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
              ) : suggested.length === 0 ? (
                <Text style={styles.emptyHint}>No suggestions yet</Text>
              ) : (
                suggested.map((user, index) =>
                  authSession ? (
                    <UserRow
                      key={user.id}
                      {...rowProps(user, index, suggested)}
                    />
                  ) : null
                )
              )}
            </View>

          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10, gap: 10,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#262626', borderRadius: 10,
    paddingHorizontal: 12, height: 36,
    borderWidth: 0,
  },
  searchInput: {
    flex: 1, color: colors.textPrimary, fontSize: 14,
    paddingVertical: 0, borderWidth: 0,
    outlineWidth: 0, outlineColor: 'transparent',
  } as any,
  clearBtn: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#888',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: { paddingLeft: 4, height: 36, justifyContent: 'center' },
  cancelText: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },

  errorText: { color: '#F97316', fontSize: 13, paddingHorizontal: 20, paddingBottom: 8 },

  // Sections
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sectionAction: { fontSize: 13, fontWeight: '600', color: colors.primary },
  emptyHint: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 16, paddingVertical: 12 },

  // Recent row
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  recentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  recentAvatarWrap: { position: 'relative' },
  recentIconBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#444', borderWidth: 1.5, borderColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  recentName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  recentHandle: { fontSize: 13, color: colors.textMuted, marginTop: 1 },

  // No results
  noResults: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 80, gap: 4, paddingHorizontal: 32,
  },
  noResultsTitle: { fontSize: 14, color: colors.textMuted },
  noResultsQuery: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  noResultsSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
