import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useChatStore } from '../store/useChatStore';
import { useUserStore } from '../store/useUserStore';
import { characters, getCharacter } from '../data/characters';
import { Avatar } from '../components/common/Avatar';
import { getCharacterMood } from '../utils/mood';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FEED_CACHE_KEY = 'daze:feed_cache';
const FEED_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface FeedPost {
  charId: string;
  charName: string;
  charEmoji: string;
  charColor: string;
  moodEmoji: string;
  moodLabel: string;
  moodColor: string;
  content: string;
  timestamp: number;
}

const FEED_TEMPLATES: Record<string, string[]> = {
  happy: [
    'aaj ka din ekdum mast tha yaar! ☀️',
    'Life is good. Coffee is hot. Vibes are immaculate. 🙌',
    'Feeling grateful for all the small moments today ✨',
    'Kuch kuch hota hai, and today it\'s all good feels 💚',
  ],
  hyped: [
    'BIG THINGS HAPPENING. Cannot tell you yet but STAY TUNED 🔥🔥',
    'RUNNING ON 4 COFFEES AND PURE ADRENALINE. LET\'S GOOO ⚡',
    'New project, new energy, new era. THIS IS IT!! 🚀',
    'If you know you know. And you\'re about to know. WATCH THIS SPACE 👀',
  ],
  moody: [
    'Not in the mood to explain myself today. Respect that. 🙄',
    'Some days are just... a lot. You know?',
    'Main aaj thoda off hoon. Don\'t take it personally.',
    'The audacity of some people today. Unbelievable.',
  ],
  chill: [
    'Just sitting with my thoughts. No rush, no pressure. 🌊',
    'Slow mornings are underrated. I said what I said.',
    'Reading, tea, no notifications. This is the life 🍵',
    'Aaj kuch nahi karna. And that\'s okay.',
  ],
  soft: [
    'Sending love to everyone who needed it today. You know who you are 💜',
    'There\'s something beautiful about just existing. Think about it.',
    'Reminder: you\'re doing better than you think 🌸',
    'Sometimes the bravest thing is just showing up. Proud of you.',
  ],
};

function generateFeedPosts(): FeedPost[] {
  const posts: FeedPost[] = [];
  const now = Date.now();

  // Use 4 random characters for the feed
  const featuredChars = [...characters].sort(() => Math.random() - 0.5).slice(0, 6);

  for (const char of featuredChars) {
    const mood = getCharacterMood(char.id);
    const templates = FEED_TEMPLATES[mood.type] || FEED_TEMPLATES.happy;
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Add character flavor based on personality
    let content = template;
    if (char.culturalDNA.hindiPhrases.length > 0 && Math.random() > 0.6) {
      const phrase = char.culturalDNA.hindiPhrases[Math.floor(Math.random() * char.culturalDNA.hindiPhrases.length)];
      // 50% chance to prepend phrase
      if (Math.random() > 0.5) content = `${phrase}! ${content}`;
    }

    posts.push({
      charId: char.id,
      charName: char.name,
      charEmoji: char.avatarEmoji,
      charColor: char.avatarColor,
      moodEmoji: mood.emoji,
      moodLabel: mood.label,
      moodColor: mood.color,
      content,
      timestamp: now - Math.floor(Math.random() * 4 * 60 * 60 * 1000), // 0-4 hrs ago
    });
  }

  return posts.sort((a, b) => b.timestamp - a.timestamp);
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const getOrCreateIndividualChat = useChatStore((s) => s.getOrCreateIndividualChat);

  const loadFeed = useCallback(async (force = false) => {
    // Try cache first
    if (!force) {
      try {
        const cached = await AsyncStorage.getItem(FEED_CACHE_KEY);
        if (cached) {
          const { posts: cachedPosts, cachedAt } = JSON.parse(cached);
          if (Date.now() - cachedAt < FEED_CACHE_TTL) {
            setPosts(cachedPosts);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    const generated = generateFeedPosts();
    setPosts(generated);
    try {
      await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts: generated, cachedAt: Date.now() }));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFeed(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(true);
    setRefreshing(false);
  };

  const handleChat = (charId: string) => {
    const chat = getOrCreateIndividualChat(charId);
    router.push(`/chat/${chat.id}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Character Feed</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => `${p.charId}_${p.timestamp}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={styles.subhead}>See what your characters are up to right now</Text>
          }
          renderItem={({ item: post }) => (
            <View style={styles.card}>
              <LinearGradient
                colors={[post.charColor + '10', 'transparent']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.cardHeader}>
                <Avatar
                  color={post.charColor}
                  emoji={post.charEmoji}
                  image={getCharacter(post.charId)?.avatarImage}
                  size={44}
                  showOnline
                />
                <View style={styles.cardMeta}>
                  <View style={styles.cardNameRow}>
                    <Text style={styles.cardName}>{post.charName}</Text>
                    <View style={[styles.moodPill, { backgroundColor: post.moodColor + '22', borderColor: post.moodColor + '55' }]}>
                      <Text style={[styles.moodText, { color: post.moodColor }]}>{post.moodEmoji} {post.moodLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTime}>{formatAgo(post.timestamp)}</Text>
                </View>
              </View>

              <Text style={styles.cardContent}>{post.content}</Text>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.chatBtn, { borderColor: post.charColor + '55' }]}
                  onPress={() => handleChat(post.charId)}
                >
                  <LinearGradient
                    colors={[post.charColor, post.charColor + 'CC']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.chatBtnText}>💬 Chat Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  subhead: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: 60 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMeta: { flex: 1, gap: 3 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  moodPill: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1,
  },
  moodText: { fontSize: 11, fontWeight: '700' },
  cardTime: { fontSize: 12, color: colors.textMuted },
  cardContent: { fontSize: 16, color: colors.textPrimary, lineHeight: 24, paddingHorizontal: 2 },
  cardActions: { flexDirection: 'row' },
  chatBtn: {
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10,
    overflow: 'hidden', borderWidth: 1,
  },
  chatBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
