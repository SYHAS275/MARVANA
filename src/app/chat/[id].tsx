import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, Share, Image, ScrollView } from 'react-native';

const DAZE_LOGO = require('../../../assets/daze-logo.png');
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../store/useChatStore';
import { useUserStore } from '../../store/useUserStore';
import { getCharacter } from '../../data/characters';
import { getStartersForCharacter } from '../../data/starters';
import { streamCharacterResponse } from '../../services/ai';
import { moderateInput } from '../../services/moderation';
import { loadMemories, extractAndUpdateMemories, shouldExtractMemory, MemoryFact } from '../../services/memory';
import { checkAndPromptReview } from '../_layout';
import { MessageList } from '../../components/chat/MessageList';
import { MessageInput } from '../../components/chat/MessageInput';
import { ConversationStarters } from '../../components/chat/ConversationStarters';
import { QuickReplies } from '../../components/chat/QuickReplies';
import { CharInfoModal } from '../../components/chat/CharInfoModal';
import { Avatar } from '../../components/common/Avatar';
import { Message } from '../../types';
import { getCharacterMood } from '../../utils/mood';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// Haptics — graceful fallback if not installed
let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}
const hapticLight = () => { try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Light); } catch {} };
const hapticMedium = () => { try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Medium); } catch {} };

const ROLEPLAY_SCENARIOS = [
  { id: 'study_buddy', label: '📚 Study Buddy', desc: 'Study session together' },
  { id: 'travel', label: '✈️ Travel Buddy', desc: 'Planning a trip' },
  { id: 'advice', label: '🧠 Life Advice', desc: 'Get real talk advice' },
  { id: 'debate', label: '🔥 Debate Me', desc: 'Disagree on anything' },
  { id: 'creative', label: '✍️ Creative Writing', desc: 'Build a story together' },
  { id: 'flirt', label: '💜 Flirty Banter', desc: 'Playful back and forth' },
];

const CHAT_THEMES = [
  { id: 'default', label: 'Purple', color: '#A855F7' },
  { id: 'rose', label: 'Rose', color: '#F43F5E' },
  { id: 'blue', label: 'Ocean', color: '#3B82F6' },
  { id: 'green', label: 'Forest', color: '#22C55E' },
  { id: 'orange', label: 'Sunset', color: '#F97316' },
  { id: 'gold', label: 'Gold', color: '#EAB308' },
];

function getRelationshipLabel(count: number): string {
  if (count >= 50) return 'Soul connection ✨';
  if (count >= 25) return 'Trusted friend 💜';
  if (count >= 10) return 'Growing bond 💛';
  return '';
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userName = useUserStore((s) => s.name);
  const userId = useUserStore((s) => s.userId);
  const recordChatActivity = useUserStore((s) => s.recordChatActivity);
  const addCoins = useUserStore((s) => s.addCoins);
  const chat = useChatStore((s) => s.chats[id!]);
  const messages = useChatStore((s) => s.messages[id!] || []);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const addReaction = useChatStore((s) => s.addReaction);
  const removeLastAIMessage = useChatStore((s) => s.removeLastAIMessage);
  const streamingChatId = useChatStore((s) => s.streamingChatId);
  const setStreaming = useChatStore((s) => s.setStreaming);

  const [isTyping, setIsTyping] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showCharInfo, setShowCharInfo] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showRoleplay, setShowRoleplay] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [roleplayScenario, setRoleplayScenario] = useState<string | undefined>(undefined);
  // Initialize theme from character's daily mood color
  const [themeColor, setThemeColor] = useState(() => {
    if (!id) return '#A855F7';
    const chat = useChatStore.getState().chats[id];
    if (!chat) return '#A855F7';
    const mood = getCharacterMood(chat.characterIds[0]);
    return mood.color;
  });
  const [persistedMemories, setPersistedMemories] = React.useState<MemoryFact[]>([]);

  // Load persisted memories on mount
  React.useEffect(() => {
    if (userId && id) {
      loadMemories(userId, id).then(setPersistedMemories).catch(() => {});
    }
  }, [userId, id]);

  if (!chat || !id) return null;

  const characterId = chat.characterIds[0];
  const character = getCharacter(characterId);
  if (!character) return null;

  const starters = getStartersForCharacter(characterId);
  const isStreaming = streamingChatId === id;
  const lastAIMessage = [...messages].reverse().find((m) => m.senderId !== 'user' && m.content);
  const messageCount = chat.messageCount || 0;
  const relationshipLabel = getRelationshipLabel(messageCount);
  const activeScenario = ROLEPLAY_SCENARIOS.find((s) => s.id === roleplayScenario);

  const handleShare = async () => {
    if (!lastAIMessage) return;
    try {
      await Share.share({
        message: `"${lastAIMessage.content}"\n\n— ${character.name} on daze\nChat with AI characters on daze`,
      });
    } catch {
      // user cancelled
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const startRoleplay = (scenarioId: string) => {
    hapticLight();
    setRoleplayScenario(scenarioId);
    setShowRoleplay(false);
    const scenario = ROLEPLAY_SCENARIOS.find((s) => s.id === scenarioId);
    if (scenario) {
      sendMessage(`Let's do a roleplay: ${scenario.desc}`);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    hapticLight();
    setShowQuickReplies(false);
    const modResult = moderateInput(text);
    if (!modResult.safe) {
      const warningMsg: Message = {
        id: `warn_${Date.now()}`,
        chatId: id!,
        senderId: characterId,
        content: modResult.reason || 'Yeh message bhejne mein dikkat hai.',
        timestamp: Date.now(),
        reactions: [],
      };
      addMessage(id!, warningMsg);
      return;
    }

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      chatId: id!,
      senderId: 'user',
      content: text,
      timestamp: Date.now(),
      reactions: [],
    };
    addMessage(id!, userMsg);
    recordChatActivity();
    addCoins(2); // Earn 2 coins per message sent
    // Prompt for app store review after enough engagement
    const allMsgs = useChatStore.getState().messages;
    const totalMsgs = Object.values(allMsgs).reduce((sum, m) => sum + m.length, 0);
    void checkAndPromptReview(totalMsgs);

    setIsTyping(true);
    setStreaming(id!);

    const aiMsgId = `ai_${Date.now()}`;
    const aiMsg: Message = {
      id: aiMsgId,
      chatId: id!,
      senderId: characterId,
      content: '',
      timestamp: Date.now(),
      reactions: [],
      isStreaming: true,
    };
    addMessage(id!, aiMsg);

    const currentMessages = [...useChatStore.getState().messages[id!] || []];

    await streamCharacterResponse(
      character,
      currentMessages.filter((m) => m.id !== aiMsgId),
      userName,
      (token) => {
        const current = useChatStore.getState().messages[id!]?.find((m) => m.id === aiMsgId);
        if (current) {
          updateMessage(id!, aiMsgId, { content: current.content + token });
        }
      },
      (fullText) => {
        updateMessage(id!, aiMsgId, { content: fullText, isStreaming: false });
        setIsTyping(false);
        setStreaming(null);
        setShowQuickReplies(true);

        // Extract memories every N messages in background
        const allMsgs = useChatStore.getState().messages[id!] || [];
        if (shouldExtractMemory(allMsgs.length) && userId) {
          const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
          extractAndUpdateMemories(userId, id!, allMsgs, apiKey)
            .then((updated) => { if (updated.length) setPersistedMemories(updated); })
            .catch(() => {});
        }
      },
      (error) => {
        console.error('AI error:', error);
        updateMessage(id!, aiMsgId, {
          content: 'Arre yaar, network issue ho gaya. Phir se try kar! 😅',
          isStreaming: false,
        });
        setIsTyping(false);
        setStreaming(null);
      },
      roleplayScenario,
      persistedMemories,
    );
  }, [id, characterId, character, userName, roleplayScenario, persistedMemories, userId]);

  const handleReact = useCallback((msgId: string, emoji: string) => {
    hapticMedium();
    addReaction(id!, msgId, emoji);
  }, [id]);

  const handleRegenerate = useCallback(async () => {
    const removed = removeLastAIMessage(id!);
    if (!removed) return;
    setShowQuickReplies(false);
    setIsTyping(true);
    setStreaming(id!);

    const aiMsgId = `ai_regen_${Date.now()}`;
    const aiMsg: Message = {
      id: aiMsgId,
      chatId: id!,
      senderId: characterId,
      content: '',
      timestamp: Date.now(),
      reactions: [],
      isStreaming: true,
    };
    addMessage(id!, aiMsg);

    const currentMessages = [...useChatStore.getState().messages[id!] || []];

    await streamCharacterResponse(
      character,
      currentMessages.filter((m) => m.id !== aiMsgId),
      userName,
      (token) => {
        const current = useChatStore.getState().messages[id!]?.find((m) => m.id === aiMsgId);
        if (current) {
          updateMessage(id!, aiMsgId, { content: current.content + token });
        }
      },
      (fullText) => {
        updateMessage(id!, aiMsgId, { content: fullText, isStreaming: false });
        setIsTyping(false);
        setStreaming(null);
        setShowQuickReplies(true);
      },
      (error) => {
        updateMessage(id!, aiMsgId, {
          content: 'Network mein kuch gadbad hai bhai 😅',
          isStreaming: false,
        });
        setIsTyping(false);
        setStreaming(null);
      },
      roleplayScenario,
    );
  }, [id, characterId, character, userName, roleplayScenario]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Chat header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        {/* Tap avatar → char info */}
        <TouchableOpacity onPress={() => setShowCharInfo(true)} activeOpacity={0.8}>
          <Avatar color={character.avatarColor} emoji={character.avatarEmoji} image={character.avatarImage} size={38} showOnline />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowCharInfo(true)} activeOpacity={0.8}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName}>{character.name}</Text>
            {relationshipLabel ? (
              <Text style={styles.levelPill}>{relationshipLabel}</Text>
            ) : null}
            {activeScenario ? (
              <Text style={styles.roleplayPill}>{activeScenario.label}</Text>
            ) : null}
          </View>
          <View style={styles.headerStatusRow}>
            <Text style={styles.headerStatus}>
              {isStreaming ? 'typing...' : 'online'}
            </Text>
            {(() => {
              const mood = getCharacterMood(characterId);
              return (
                <Text style={[styles.moodBadge, { color: mood.color }]}>
                  {mood.emoji} {mood.label}
                </Text>
              );
            })()}
          </View>
        </TouchableOpacity>
        {/* Roleplay button */}
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowRoleplay(true)}>
          <Text style={{ fontSize: 18 }}>🎭</Text>
        </TouchableOpacity>
        {/* Theme button */}
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowThemes(true)}>
          <Ionicons name="color-palette-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {messages.length > 0 && (
          <TouchableOpacity style={styles.headerAction} onPress={() => setShowShareCard(true)}>
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Chat background with mood-based color tint */}
        <View style={styles.chatBg}>
          <LinearGradient
            colors={[themeColor + '14', 'transparent', themeColor + '08']}
            style={styles.chatPatternTop}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {messages.length === 0 ? (
            <View style={styles.starterArea}>
              <View style={styles.starterCard}>
                <Avatar color={character.avatarColor} emoji={character.avatarEmoji} image={character.avatarImage} size={72} showOnline />
                <Text style={styles.starterTitle}>{character.name}</Text>
                <Text style={styles.starterRole}>{character.archetype} • {character.city}</Text>
                <Text style={styles.starterTagline}>"{character.tagline}"</Text>
              </View>
              <ConversationStarters starters={starters} onSelect={sendMessage} />
            </View>
          ) : (
            <MessageList
              messages={messages}
              isTyping={isTyping && !messages.some((m) => m.isStreaming)}
              onReact={(msgId, emoji) => handleReact(msgId, emoji)}
              onRegenerate={handleRegenerate}
              bubbleColor={themeColor !== '#A855F7' ? themeColor : undefined}
            />
          )}
        </View>

        {/* Quick reply chips */}
        {showQuickReplies && !isStreaming && (
          <QuickReplies
            onSelect={(text) => {
              setShowQuickReplies(false);
              sendMessage(text);
            }}
            characterArchetype={character.archetype}
          />
        )}

        <MessageInput
          onSend={(text) => {
            setShowQuickReplies(false);
            sendMessage(text);
          }}
          disabled={isStreaming}
          mentionableNames={[]}
        />
      </KeyboardAvoidingView>

      {/* Character info modal */}
      <CharInfoModal
        character={character}
        visible={showCharInfo}
        onClose={() => setShowCharInfo(false)}
        messageCount={messageCount}
      />

      {/* Roleplay modal */}
      <Modal visible={showRoleplay} transparent animationType="slide" onRequestClose={() => setShowRoleplay(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRoleplay(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>🎭 Roleplay Mode</Text>
              <Text style={styles.sheetSub}>Pick a scenario and {character.name} will stay in character</Text>
              <View style={styles.scenarioGrid}>
                {ROLEPLAY_SCENARIOS.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.scenarioCard, roleplayScenario === s.id && styles.scenarioCardActive]}
                    onPress={() => startRoleplay(s.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.scenarioLabel}>{s.label}</Text>
                    <Text style={styles.scenarioDesc}>{s.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {roleplayScenario && (
                <TouchableOpacity
                  style={styles.clearRoleplay}
                  onPress={() => { setRoleplayScenario(undefined); setShowRoleplay(false); }}
                >
                  <Text style={styles.clearRoleplayText}>✕ Exit Roleplay Mode</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Themes modal */}
      <Modal visible={showThemes} transparent animationType="slide" onRequestClose={() => setShowThemes(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowThemes(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>🎨 Chat Theme</Text>
              <View style={styles.themeRow}>
                {CHAT_THEMES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => { setThemeColor(t.color); setShowThemes(false); hapticLight(); }}
                    style={[styles.themeCircle, { backgroundColor: t.color }, themeColor === t.color && styles.themeCircleActive]}
                  >
                    {themeColor === t.color && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.themeLabels}>
                {CHAT_THEMES.map((t) => (
                  <Text key={t.id} style={[styles.themeLabel, themeColor === t.color && { color: t.color }]}>{t.label}</Text>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Share Card Modal */}
      <Modal visible={showShareCard} transparent animationType="fade" onRequestClose={() => setShowShareCard(false)}>
        <TouchableOpacity style={styles.shareOverlay} activeOpacity={1} onPress={() => setShowShareCard(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <LinearGradient
              colors={[colors.primaryDark, '#1a0035']}
              style={styles.shareCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.shareCardInner}>
                <View style={styles.shareCharHeader}>
                  <Avatar color={character.avatarColor} emoji={character.avatarEmoji} image={character.avatarImage} size={48} showOnline />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.shareCharName}>{character.name}</Text>
                    <Text style={styles.shareCharRole}>{character.archetype}</Text>
                  </View>
                </View>
                {lastAIMessage && (
                  <Text style={styles.shareQuote} numberOfLines={5}>
                    "{lastAIMessage.content}"
                  </Text>
                )}
                <View style={styles.shareBranding}>
                  <Image source={DAZE_LOGO} style={styles.shareLogo} resizeMode="contain" />
                  <Text style={styles.shareBrandSub}>chat with AI characters</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
          <Text style={styles.shareTip}>Screenshot this card to share as a story</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 7,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  backBtn: { padding: 5 },
  headerInfo: { flex: 1 },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  headerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  levelPill: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleplayPill: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '700',
    backgroundColor: '#F9731618',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerStatus: {
    ...typography.small,
    color: colors.primary,
    fontSize: 12,
  },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodBadge: { fontSize: 11, fontWeight: '700' },
  headerAction: { padding: 6 },
  chatArea: { flex: 1 },
  chatBg: {
    flex: 1,
    backgroundColor: colors.chatBg,
    position: 'relative',
  },
  chatPatternTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.6,
  },
  starterArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  starterCard: {
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxxl,
    borderRadius: 16,
    marginHorizontal: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  starterTitle: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  starterRole: { ...typography.caption, color: colors.primary, marginTop: 4, fontWeight: '600' },
  starterTagline: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', fontStyle: 'italic' },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  sheetSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scenarioCard: {
    width: '47%',
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scenarioCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  scenarioLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  scenarioDesc: { fontSize: 12, color: colors.textMuted },
  clearRoleplay: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F9731618',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F9731633',
  },
  clearRoleplayText: { color: '#F97316', fontWeight: '700', fontSize: 14 },
  // Themes
  themeRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginBottom: 10,
  },
  themeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCircleActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  themeLabels: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
  },
  themeLabel: {
    width: 44,
    textAlign: 'center',
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  // Share card modal
  shareOverlay: {
    flex: 1,
    backgroundColor: '#000000CC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  shareCard: { width: 320, borderRadius: 24, overflow: 'hidden' },
  shareCardInner: { padding: spacing.xxl, gap: spacing.lg },
  shareCharHeader: { flexDirection: 'row', alignItems: 'center' },
  shareCharName: { ...typography.h3, color: '#fff', fontWeight: '800' },
  shareCharRole: { ...typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  shareQuote: { ...typography.body, color: '#fff', lineHeight: 24, fontStyle: 'italic', opacity: 0.9 },
  shareBranding: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: spacing.md,
    alignItems: 'flex-end',
  },
  shareLogo: { width: 80, height: 40 },
  shareBrandSub: { ...typography.small, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    borderRadius: 999,
  },
  shareBtnText: { ...typography.bodyBold, color: '#fff' },
  shareTip: { ...typography.small, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
});
