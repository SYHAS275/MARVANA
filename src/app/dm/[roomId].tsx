import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUserStore } from '../../store/useUserStore';
import { fetchDMMessages, sendDMMessage, DMMessage, reportUser, ReportReason, setTypingStatus, getTypingStatus, addDMReaction, removeDMReaction, DMReaction } from '../../services/supabase';
import { DMReactionPicker } from '../../components/chat/DMReactionPicker';
import { getDMSuggestion } from '../../services/ai';
import { moderateInput } from '../../services/moderation';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

function UserAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const letter = (name || '?')[0].toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},60%,40%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{letter}</Text>
    </View>
  );
}

const POLL_INTERVAL = 3000;
const AI_SENDER = 'daze_ai';

interface LocalMessage extends DMMessage {
  isAI?: boolean;
  isStreaming?: boolean;
}

export default function DMChatScreen() {
  const router = useRouter();
  const { roomId, otherId, otherName: rawOtherName } = useLocalSearchParams<{ roomId: string; otherId: string; otherName: string }>();
  const otherName = rawOtherName ? decodeURIComponent(rawOtherName) : 'User';
  const authSession = useUserStore((s) => s.authSession);
  const myId = useUserStore((s) => s.userId);
  const myName = useUserStore((s) => s.name) || 'You';
  const blockUser = useUserStore((s) => s.blockUser);
  const isBlocked = useUserStore((s) => s.isBlocked);

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiStreaming, setAiStreaming] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactions, setReactions] = useState<Record<string, DMReaction[]>>({});
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<LocalMessage | null>(null);

  const listRef = useRef<FlatList>(null);
  const lastTimestamp = useRef<string | undefined>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async (initial = false) => {
    if (!authSession || !roomId) return;
    try {
      const msgs = await fetchDMMessages(
        authSession.accessToken,
        roomId,
        initial ? undefined : lastTimestamp.current,
      );
      if (msgs.length > 0) {
        lastTimestamp.current = msgs[msgs.length - 1].created_at;
        setMessages((prev) => initial ? msgs : [...prev, ...msgs]);
        if (!initial) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {
      // silent
    } finally {
      if (initial) setLoading(false);
    }
  }, [authSession, roomId]);

  useEffect(() => {
    loadMessages(true).then(() => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
    });
    pollRef.current = setInterval(() => {
      loadMessages(false);
      // Poll other user's typing status
      if (authSession && roomId && otherId) {
        getTypingStatus(authSession.accessToken, roomId, otherId)
          .then(setOtherTyping)
          .catch(() => {});
      }
    }, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (!authSession || !myId || !roomId) return;
    // Broadcast typing
    void setTypingStatus(authSession.accessToken, roomId, myId, true);
    // Clear after 2.5s of no typing
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      void setTypingStatus(authSession.accessToken, roomId, myId, false);
    }, 2500);
  };

  const handleShowMenu = () => {
    Alert.alert(otherName, 'What would you like to do?', [
      {
        text: '🚩 Report User',
        onPress: () => {
          Alert.alert('Report User', 'Why are you reporting this user?', [
            { text: 'Harassment', onPress: () => void submitReport('harassment') },
            { text: 'Hate Speech', onPress: () => void submitReport('hate_speech') },
            { text: 'Spam', onPress: () => void submitReport('spam') },
            { text: 'Inappropriate Content', onPress: () => void submitReport('inappropriate_content') },
            { text: 'Fake Account', onPress: () => void submitReport('fake_account') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
      },
      {
        text: isBlocked(otherId) ? '✅ Unblock User' : '🚫 Block User',
        style: isBlocked(otherId) ? 'default' : 'destructive',
        onPress: async () => {
          if (isBlocked(otherId)) {
            const { unblockUser } = useUserStore.getState();
            await unblockUser(otherId);
            Alert.alert('Unblocked', `${otherName} has been unblocked.`);
          } else {
            Alert.alert('Block User', `Block ${otherName}? They won't be able to message you.`, [
              { text: 'Block', style: 'destructive', onPress: async () => { await blockUser(otherId); router.back(); } },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitReport = async (reason: ReportReason) => {
    if (!authSession || !myId) return;
    try {
      await reportUser(authSession.accessToken, myId, otherId, reason);
      Alert.alert('Report Submitted', 'Thank you. Our team will review this report within 24 hours.');
    } catch {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    }
  };

  const handleSend = async (overrideText?: string) => {
    const content = (overrideText ?? text).trim();
    if (!content || sending) return;

    if (!authSession || !myId) {
      Alert.alert('Not logged in', 'Please log in to send messages.');
      return;
    }

    // Content moderation
    const mod = moderateInput(content);
    if (mod.level === 'block') {
      Alert.alert('Message Blocked', mod.reason);
      return;
    }
    if (mod.level === 'warn') {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert('Heads Up', mod.reason, [
          { text: 'Send Anyway', onPress: () => resolve(true) },
          { text: 'Edit Message', style: 'cancel', onPress: () => resolve(false) },
        ]);
      });
      if (!proceed) return;
    }

    const replyToId = replyTo?.id;
    setText('');
    setAiSuggestion('');
    setReplyTo(null);
    setSending(true);
    const optimistic: LocalMessage = {
      id: `opt_${Date.now()}`,
      room_id: roomId,
      sender_id: myId,
      content,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const sent = await sendDMMessage(authSession.accessToken, roomId, myId, content, replyToId);
      lastTimestamp.current = sent.created_at;
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent : m));
    } catch (err) {
      // Remove optimistic message and restore text
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(content);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Failed to send', `Message could not be sent.\n\n${msg}`);
    } finally {
      setSending(false);
    }
  };

  const handleAISuggest = async () => {
    if (aiLoading) return;
    setAiSuggestion('');
    setAiStreaming('');
    setAiLoading(true);

    // Build context for AI
    const context = messages.slice(-12).map((m) => ({
      senderId: m.sender_id,
      content: m.content,
      senderName: m.sender_id === myId ? myName : otherName,
    }));

    await getDMSuggestion(
      context,
      myName,
      otherName,
      (token) => setAiStreaming((prev) => prev + token),
      (full) => {
        setAiSuggestion(full);
        setAiStreaming('');
        setAiLoading(false);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      () => {
        setAiLoading(false);
        setAiStreaming('');
      }
    );
  };

  const renderMessage = ({ item }: { item: LocalMessage }) => {
    const isMe = item.sender_id === myId;

    if (item.sender_id === AI_SENDER || item.isAI) {
      return (
        <View style={styles.aiMsgRow}>
          <LinearGradient colors={['#A855F7', '#EC4899']} style={styles.aiMsgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.aiMsgLabel}>✨ Daze AI</Text>
          </LinearGradient>
          <View style={styles.aiMsgBody}>
            <Text style={styles.aiMsgText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgReactions = reactions[item.id] || [];
    const myReaction = msgReactions.find((r) => r.user_id === myId);

    const handleReact = async (emoji: string) => {
      if (!authSession || !myId) return;
      if (myReaction?.emoji === emoji) {
        await removeDMReaction(authSession.accessToken, item.id, myId);
        setReactions((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] || []).filter((r) => r.user_id !== myId),
        }));
      } else {
        await addDMReaction(authSession.accessToken, item.id, myId, emoji);
        setReactions((prev) => {
          const existing = (prev[item.id] || []).filter((r) => r.user_id !== myId);
          return { ...prev, [item.id]: [...existing, { message_id: item.id, user_id: myId, emoji }] };
        });
      }
    };

    // Group reactions by emoji
    const grouped: Record<string, number> = {};
    msgReactions.forEach((r) => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });

    const replyToMsg = item.reply_to_id ? messages.find((m) => m.id === item.reply_to_id) : null;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => {
          Alert.alert('', '', [
            { text: '↩️ Reply', onPress: () => setReplyTo(item) },
            { text: '😀 React', onPress: () => setReactionTarget(item.id) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        style={[styles.msgRow, isMe && styles.msgRowMe]}
      >
        {!isMe && <UserAvatar name={otherName} size={28} />}
        <View>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {replyToMsg && (
              <View style={[styles.quotedMsg, isMe && styles.quotedMsgMe]}>
                <Text style={styles.quotedName}>{replyToMsg.sender_id === myId ? 'You' : otherName}</Text>
                <Text style={styles.quotedText} numberOfLines={2}>{replyToMsg.content}</Text>
              </View>
            )}
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
            <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{time}</Text>
          </View>
          {Object.keys(grouped).length > 0 && (
            <View style={[styles.reactionsRow, isMe && { justifyContent: 'flex-end' }]}>
              {Object.entries(grouped).map(([emoji, count]) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionPill, myReaction?.emoji === emoji && styles.reactionPillActive]}
                  onPress={() => void handleReact(emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const displayMessages = messages;
  const showStreamingBubble = aiStreaming.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <UserAvatar name={otherName} size={36} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherName}</Text>
          <Text style={styles.headerSub}>Direct Message</Text>
        </View>
        {/* AI Agent badge */}
        <View style={styles.aiBadge}>
          <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <Text style={styles.aiBadgeText}>✨ AI</Text>
        </View>
        {/* 3-dot menu */}
        <TouchableOpacity onPress={handleShowMenu} style={styles.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={displayMessages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>Say hi to {otherName}!</Text>
                <TouchableOpacity
                  style={styles.icebreakerBtn}
                  onPress={handleAISuggest}
                  disabled={aiLoading}
                >
                  <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  {aiLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.icebreakerText}>✨ Get an icebreaker</Text>
                  }
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              <>
              {otherTyping && (
                <View style={styles.typingRow}>
                  <UserAvatar name={otherName} size={24} />
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingDots}>• • •</Text>
                  </View>
                </View>
              )}
              {showStreamingBubble ? (
                <View style={styles.aiMsgRow}>
                  <LinearGradient colors={['#A855F7', '#EC4899']} style={styles.aiMsgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.aiMsgLabel}>✨ Daze AI</Text>
                  </LinearGradient>
                  <View style={styles.aiMsgBody}>
                    <Text style={styles.aiMsgText}>{aiStreaming}<Text style={{ color: colors.primary }}>▋</Text></Text>
                  </View>
                </View>
              ) : null}
              </>
            }
            renderItem={renderMessage}
          />
        )}

        {/* AI Suggestion chip */}
        {aiSuggestion.length > 0 && (
          <View style={styles.suggestionRow}>
            <LinearGradient
              colors={['#A855F722', '#EC489922']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionLabel}>✨ Suggestion</Text>
              <Text style={styles.suggestionText}>{aiSuggestion}</Text>
            </View>
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={styles.suggestionSend}
                onPress={() => handleSend(aiSuggestion)}
              >
                <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Text style={styles.suggestionSendText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAiSuggestion('')} style={styles.suggestionDismiss}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reply preview */}
        {replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyPreviewName}>{replyTo.sender_id === myId ? 'You' : otherName}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>{replyTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyClose}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {/* AI button */}
          <TouchableOpacity
            style={[styles.aiBtn, aiLoading && styles.aiBtnLoading]}
            onPress={handleAISuggest}
            disabled={aiLoading}
          >
            {aiLoading
              ? <ActivityIndicator size="small" color="#A855F7" />
              : (
                <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              )
            }
            {!aiLoading && <Text style={styles.aiBtnText}>✨</Text>}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder={`Message ${otherName}...`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <DMReactionPicker
        visible={reactionTarget !== null}
        onClose={() => setReactionTarget(null)}
        onSelect={(emoji) => {
          if (reactionTarget && authSession && myId) {
            const msgReactions = reactions[reactionTarget] || [];
            const myReaction = msgReactions.find((r) => r.user_id === myId);
            if (myReaction?.emoji === emoji) {
              void removeDMReaction(authSession.accessToken, reactionTarget, myId);
              setReactions((prev) => ({ ...prev, [reactionTarget]: (prev[reactionTarget] || []).filter((r) => r.user_id !== myId) }));
            } else {
              void addDMReaction(authSession.accessToken, reactionTarget, myId, emoji);
              setReactions((prev) => {
                const existing = (prev[reactionTarget] || []).filter((r) => r.user_id !== myId);
                return { ...prev, [reactionTarget]: [...existing, { message_id: reactionTarget, user_id: myId, emoji }] };
              });
            }
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  aiBadge: {
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    overflow: 'hidden',
  },
  aiBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  typingBubble: { backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  typingDots: { color: colors.textMuted, fontSize: 18, letterSpacing: 2 },
  menuBtn: { padding: 4, marginLeft: 4 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, paddingHorizontal: 4 },
  reactionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#333',
  },
  reactionPillActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 12, gap: 10 },
  emptyBox: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  icebreakerBtn: {
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  icebreakerText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  bubble: {
    maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, gap: 4,
  },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: colors.bgElevated, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText: { fontSize: 15, color: colors.textPrimary, lineHeight: 21 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: colors.textMuted, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
  // AI message in chat
  aiMsgRow: {
    marginTop: 6, marginBottom: 4,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#A855F733',
    marginHorizontal: 0,
  },
  aiMsgGradient: { paddingHorizontal: 12, paddingVertical: 4 },
  aiMsgLabel: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  aiMsgBody: { padding: 12, backgroundColor: '#A855F711' },
  aiMsgText: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  // Suggestion chip above input
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#A855F733',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  suggestionContent: { flex: 1, gap: 3 },
  suggestionLabel: { fontSize: 11, fontWeight: '700', color: '#A855F7', letterSpacing: 0.3 },
  suggestionText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  suggestionActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionSend: {
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7,
    overflow: 'hidden',
  },
  suggestionSendText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  suggestionDismiss: { padding: 4 },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  aiBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  aiBtnLoading: { backgroundColor: colors.bgElevated },
  aiBtnText: { fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    color: colors.textPrimary, fontSize: 15,
    maxHeight: 120,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  // Quoted message inside bubble
  quotedMsg: {
    borderLeftWidth: 3, borderLeftColor: colors.primary + '88',
    paddingLeft: 8, marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: 6,
  },
  quotedMsgMe: { borderLeftColor: 'rgba(255,255,255,0.7)' },
  quotedName: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 1 },
  quotedText: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  // Reply preview above input
  replyPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  replyBar: { width: 3, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 2 },
  replyPreviewName: { fontSize: 12, fontWeight: '700', color: colors.primary },
  replyPreviewText: { fontSize: 13, color: colors.textMuted },
  replyClose: { padding: 4 },
});
