import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  TextInput, Modal, Animated, Dimensions, KeyboardAvoidingView,
  Platform, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/useUserStore';
import { fetchStories, postStory, deleteStory, Story } from '../services/supabase';
import { colors } from '../theme/colors';

const { width: SW, height: SH } = Dimensions.get('window');

const BG_COLORS = ['#A855F7', '#EC4899', '#3B82F6', '#22C55E', '#F97316', '#06B6D4', '#EF4444', '#8B5CF6'];
const EMOJIS = ['✨', '🔥', '💜', '😂', '👀', '💅', '🎯', '🌙', '⚡', '🫶', '😍', '🥹'];

function getHue(name: string) {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

function Avatar({ name, size }: { name: string; size: number }) {
  const hue = getHue(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},55%,38%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.4 }}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

// ─── Story Bubble (horizontal row) ──────────────────────────────────────────

function StoryBubble({ story, myId, isMe, onView, onDelete }: {
  story: Story; myId: string; isMe: boolean;
  onView: (s: Story) => void; onDelete: (id: string) => void;
}) {
  const name = story.author_name || 'User';
  return (
    <TouchableOpacity
      style={bubble.wrap}
      onPress={() => onView(story)}
      onLongPress={() => isMe && Alert.alert('Story', 'Delete this story?', [
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(story.id) },
        { text: 'Cancel', style: 'cancel' },
      ])}
      activeOpacity={0.85}
    >
      <View style={[bubble.ring, { borderColor: story.bg_color }]}>
        <View style={[bubble.inner, { backgroundColor: story.bg_color + '33' }]}>
          <Avatar name={name} size={52} />
          {isMe && (
            <View style={bubble.meBadge}>
              <Ionicons name="person" size={9} color="#fff" />
            </View>
          )}
        </View>
      </View>
      <Text style={bubble.name} numberOfLines={1}>{isMe ? 'You' : name.split(' ')[0]}</Text>
    </TouchableOpacity>
  );
}

const bubble = StyleSheet.create({
  wrap: { alignItems: 'center', width: 76, gap: 6 },
  ring: { width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, padding: 3 },
  inner: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  meBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.bg,
  },
});

// ─── Story Card (list view) ──────────────────────────────────────────────────

function StoryCard({ story, myId, onView, onDelete }: {
  story: Story; myId: string;
  onView: (s: Story) => void; onDelete: (id: string) => void;
}) {
  const isMe = story.user_id === myId;
  const name = story.author_name || 'User';
  const timeAgo = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 60000);
  const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;

  return (
    <TouchableOpacity
      style={storycard.wrap}
      onPress={() => onView(story)}
      onLongPress={() => isMe && Alert.alert('Story', 'Delete this story?', [
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(story.id) },
        { text: 'Cancel', style: 'cancel' },
      ])}
      activeOpacity={0.85}
    >
      {/* Color accent left bar */}
      <View style={[storycard.accent, { backgroundColor: story.bg_color }]} />

      <View style={storycard.content}>
        <View style={storycard.topRow}>
          <Avatar name={name} size={40} />
          <View style={storycard.meta}>
            <Text style={storycard.name}>{isMe ? 'Your Story' : name}</Text>
            <Text style={storycard.time}>{timeStr}</Text>
          </View>
          <Text style={storycard.emoji}>{story.emoji}</Text>
        </View>
        <Text style={storycard.preview} numberOfLines={2}>{story.content}</Text>
      </View>
    </TouchableOpacity>
  );
}

const storycard = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: colors.bgCard,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  accent: { width: 4 },
  content: { flex: 1, padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  emoji: { fontSize: 28 },
  preview: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});

// ─── Story Viewer ────────────────────────────────────────────────────────────

function StoryViewer({ stories, startIndex, onClose }: {
  stories: Story[]; startIndex: number; onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const progress = useRef(new Animated.Value(0)).current;
  const story = stories[index];

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: 5000, useNativeDriver: false });
    anim.start(({ finished }) => { if (finished) goNext(); });
    return () => anim.stop();
  }, [index]);

  const goNext = () => {
    if (index < stories.length - 1) setIndex(index + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (!story) return null;

  const name = story.author_name || 'User';
  const timeAgo = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 60000);
  const timeStr = timeAgo < 1 ? 'Just now' : timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={viewer.container}>
        <LinearGradient colors={[story.bg_color + 'FF', story.bg_color + 'CC']} style={StyleSheet.absoluteFillObject} />
        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={viewer.topGrad} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={viewer.bottomGrad} />

        {/* Progress bars */}
        <View style={viewer.progressRow}>
          {stories.map((_, i) => (
            <View key={i} style={viewer.track}>
              <Animated.View style={[
                viewer.fill,
                i < index ? { width: '100%' } : i === index
                  ? { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                  : { width: '0%' },
              ]} />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={viewer.header}>
          <View style={viewer.userRow}>
            <Avatar name={name} size={38} />
            <View>
              <Text style={viewer.userName}>{name}</Text>
              <Text style={viewer.userTime}>{timeStr}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={viewer.closeBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tap zones */}
        <View style={viewer.tapZones}>
          <TouchableOpacity style={{ flex: 1 }} onPress={goPrev} activeOpacity={1} />
          <TouchableOpacity style={{ flex: 1 }} onPress={goNext} activeOpacity={1} />
        </View>

        {/* Content */}
        <View style={viewer.content}>
          <Text style={viewer.bigEmoji}>{story.emoji}</Text>
          <Text style={viewer.text}>{story.content}</Text>
        </View>
      </View>
    </Modal>
  );
}

const viewer = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  progressRow: { position: 'absolute', top: 58, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: '#fff', borderRadius: 2 },
  header: {
    position: 'absolute', top: 72, left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { color: '#fff', fontWeight: '800', fontSize: 15 },
  userTime: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  closeBtn: { padding: 4 },
  tapZones: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  content: { alignItems: 'center', gap: 20, paddingHorizontal: 28 },
  bigEmoji: { fontSize: 80 },
  text: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 34, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});

// ─── Compose Sheet ────────────────────────────────────────────────────────────

function ComposeSheet({ visible, onClose, onPost }: {
  visible: boolean; onClose: () => void;
  onPost: (content: string, emoji: string, bgColor: string) => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [posting, setPosting] = useState(false);
  const slideY = useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideY, { toValue: SH, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    await onPost(content.trim(), emoji, bgColor);
    setContent('');
    setEmoji('✨');
    setBgColor(BG_COLORS[0]);
    setPosting(false);
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={compose.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
          <Animated.View style={[compose.sheet, { transform: [{ translateY: slideY }] }]}>
            <LinearGradient
              colors={[bgColor + 'CC', bgColor + '88']}
              style={compose.sheetBg}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />

            {/* Handle */}
            <View style={compose.handle} />

            {/* Top bar */}
            <View style={compose.topBar}>
              <TouchableOpacity onPress={onClose} style={compose.cancelBtn}>
                <Text style={compose.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={compose.sheetTitle}>New Story</Text>
              <TouchableOpacity
                style={[compose.postBtn, (!content.trim() || posting) && compose.postBtnDisabled]}
                onPress={handlePost}
                disabled={!content.trim() || posting}
              >
                <Text style={compose.postText}>{posting ? '...' : 'Post'}</Text>
              </TouchableOpacity>
            </View>

            {/* Preview area */}
            <View style={compose.preview}>
              <Text style={compose.previewEmoji}>{emoji}</Text>
              <TextInput
                style={compose.input}
                value={content}
                onChangeText={setContent}
                placeholder="What's on your mind?"
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                maxLength={200}
                autoFocus
                textAlignVertical="center"
              />
              <Text style={compose.charCount}>{content.length}/200</Text>
            </View>

            {/* Emoji row */}
            <View style={compose.section}>
              <Text style={compose.sectionLabel}>Emoji</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={compose.emojiScroll}>
                {EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[compose.emojiBtn, emoji === e && compose.emojiBtnActive]}
                  >
                    <Text style={compose.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Color row */}
            <View style={compose.section}>
              <Text style={compose.sectionLabel}>Background</Text>
              <View style={compose.colorRow}>
                {BG_COLORS.map((col) => (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setBgColor(col)}
                    style={[compose.colorDot, { backgroundColor: col }, bgColor === col && compose.colorDotActive]}
                  >
                    {bgColor === col && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const compose = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36, gap: 16, overflow: 'hidden',
  },
  sheetBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelBtn: { padding: 4 },
  cancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  sheetTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
  postBtn: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 8 },
  postBtnDisabled: { opacity: 0.4 },
  postText: { color: '#000', fontWeight: '900', fontSize: 14 },
  preview: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, gap: 8, alignItems: 'center', minHeight: 120, justifyContent: 'center' },
  previewEmoji: { fontSize: 44 },
  input: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', width: '100%' },
  charCount: { fontSize: 11, color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-end' },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  emojiScroll: { gap: 6, paddingBottom: 4 },
  emojiBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  emojiText: { fontSize: 24 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StoriesScreen() {
  const router = useRouter();
  const authSession = useUserStore((s) => s.authSession);
  const myId = useUserStore((s) => s.userId);
  const myName = useUserStore((s) => s.name) || 'Me';

  const [stories, setStories] = useState<Story[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (authSession) load(); }, [authSession]);

  const load = async () => {
    if (!authSession) return;
    try {
      const data = await fetchStories(authSession.accessToken);
      setStories(data.map((s) => ({ ...s, author_name: s.user_id === myId ? myName : s.author_name || 'User' })));
    } catch {}
  };

  const handlePost = async (content: string, emoji: string, bgColor: string) => {
    if (!authSession || !myId) return;
    try {
      await postStory(authSession.accessToken, myId, content, emoji, bgColor);
      setShowCompose(false);
      await load();
    } catch { Alert.alert('Error', 'Could not post story.'); }
  };

  const handleDelete = async (id: string) => {
    if (!authSession) return;
    await deleteStory(authSession.accessToken, id);
    setStories((prev) => prev.filter((s) => s.id !== id));
  };

  // Sort: my story first
  const sorted = [...stories].sort((a, b) => {
    if (a.user_id === myId) return -1;
    if (b.user_id === myId) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Stories</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCompose(true)}>
          <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Story</Text>
        </TouchableOpacity>
      </View>

      {stories.length === 0 ? (
        /* Empty state */
        <View style={styles.empty}>
          <LinearGradient colors={['#A855F714', 'transparent']} style={styles.emptyGrad} />
          <Text style={styles.emptyEmoji}>📸</Text>
          <Text style={styles.emptyTitle}>No stories yet</Text>
          <Text style={styles.emptySub}>Be the first to share a 24-hour story with the Daze community!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCompose(true)}>
            <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Post a Story</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Horizontal bubble row */}
          <View style={styles.bubblesSection}>
            <Text style={styles.sectionLabel}>Active Stories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bubblesScroll}>
              {/* Add story bubble */}
              <TouchableOpacity style={styles.addBubbleWrap} onPress={() => setShowCompose(true)} activeOpacity={0.85}>
                <View style={styles.addBubble}>
                  <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  <Ionicons name="add" size={28} color="#fff" />
                </View>
                <Text style={styles.addBubbleName}>Add</Text>
              </TouchableOpacity>

              {sorted.map((s, i) => (
                <StoryBubble
                  key={s.id}
                  story={s}
                  myId={myId}
                  isMe={s.user_id === myId}
                  onView={() => setViewingIndex(sorted.indexOf(s))}
                  onDelete={handleDelete}
                />
              ))}
            </ScrollView>
          </View>

          {/* Story cards */}
          <View style={styles.cardsSection}>
            <Text style={styles.sectionLabel}>All Stories · {stories.length}</Text>
            <View style={styles.cardsList}>
              {sorted.map((s, i) => (
                <StoryCard
                  key={s.id}
                  story={s}
                  myId={myId}
                  onView={() => setViewingIndex(i)}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* Compose */}
      <ComposeSheet
        visible={showCompose}
        onClose={() => setShowCompose(false)}
        onPost={handlePost}
      />

      {/* Viewer */}
      {viewingIndex !== null && (
        <StoryViewer
          stories={sorted}
          startIndex={viewingIndex}
          onClose={() => setViewingIndex(null)}
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
  title: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    overflow: 'hidden',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 12, overflow: 'hidden' },
  emptyGrad: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  emptyEmoji: { fontSize: 72 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 18, paddingHorizontal: 24, paddingVertical: 14,
    overflow: 'hidden', marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  // Sections
  bubblesSection: { paddingTop: 16, paddingBottom: 8 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, marginBottom: 12,
  },
  bubblesScroll: { paddingHorizontal: 16, gap: 14 },
  addBubbleWrap: { alignItems: 'center', width: 70, gap: 6 },
  addBubble: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: '#A855F7',
  },
  addBubbleName: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  cardsSection: { paddingTop: 8, paddingHorizontal: 16 },
  cardsList: { gap: 10, paddingBottom: 8 },
});
