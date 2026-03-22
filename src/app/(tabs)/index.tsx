import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, Pressable, TextInput, Image, Animated, Alert } from 'react-native';
import { CharInfoModal } from '../../components/chat/CharInfoModal';
import { getCharacterMood } from '../../utils/mood';
import { getCharacterStatus } from '../../data/statuses';

const DAZE_LOGO = require('../../../assets/daze-logo.png');
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/useUserStore';
import { useChatStore } from '../../store/useChatStore';
import { characters, getCharacter } from '../../data/characters';
import { scenarios } from '../../data/scenarios';
import { Avatar } from '../../components/common/Avatar';
import { Character, GroupScenario } from '../../types';
import { OnboardingTutorial, hasDoneTutorial } from '../../components/common/OnboardingTutorial';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const PREMIUM_UNLOCK_STREAK = 5; // 5-day streak unlocks premium chars for free

export default function HomeScreen() {
  const router = useRouter();
  const userName = useUserStore((s) => s.name);
  const favoriteIds = useUserStore((s) => s.favoriteCharacters);
  const streakCount = useUserStore((s) => s.streakCount);
  const isPremiumUser = useUserStore((s) => s.isPremium);
  const getOrCreateIndividualChat = useChatStore((s) => s.getOrCreateIndividualChat);
  const createChat = useChatStore((s) => s.createChat);

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [infoChar, setInfoChar] = useState<Character | null>(null);
  const [storyChar, setStoryChar] = useState<Character | null>(null);
  const storyFade = useRef(new Animated.Value(0)).current;

  // Show tutorial on first launch after onboarding
  useEffect(() => {
    hasDoneTutorial().then((done) => {
      if (!done) setShowTutorial(true);
    });
  }, []);

  const showStory = (char: Character) => {
    setStoryChar(char);
    Animated.timing(storyFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(storyFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setStoryChar(null));
    }, 3000);
  };

  const sortedCharacters = [
    ...characters.filter((c) => favoriteIds.includes(c.id)),
    ...characters.filter((c) => !favoriteIds.includes(c.id)),
  ];

  const filteredCharacters = search.trim()
    ? sortedCharacters.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.archetype.toLowerCase().includes(search.toLowerCase())
      )
    : sortedCharacters;

  const featured = sortedCharacters[0];

  // Daily vibe: pick a character seeded by today's day-of-year
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyVibeChar = characters[dayOfYear % characters.length];

  const handleCharacterPress = (character: Character) => {
    const charIsPremium = character.isPremium;
    const isUnlocked = isPremiumUser || streakCount >= PREMIUM_UNLOCK_STREAK;
    if (charIsPremium && !isUnlocked) {
      const needed = PREMIUM_UNLOCK_STREAK - streakCount;
      Alert.alert(
        '👑 Premium Character',
        `${character.name} is a premium character. Subscribe for ₹99/month or keep a ${PREMIUM_UNLOCK_STREAK}-day streak to unlock!\n\nCurrent streak: 🔥 ${streakCount} days`,
        [
          { text: 'Go Premium', onPress: () => router.push('/premium' as any) },
          { text: 'Keep Streaking', style: 'cancel' },
        ]
      );
      return;
    }
    const chat = getOrCreateIndividualChat(character.id);
    router.push(`/chat/${chat.id}`);
  };

  const handleScenarioPress = (scenario: GroupScenario) => {
    const chat = {
      id: `group_${scenario.id}_${Date.now()}`,
      type: 'group' as const,
      characterIds: scenario.characterIds,
      title: scenario.name,
      scenarioId: scenario.id,
      mutedCharacters: [],
    };
    createChat(chat);
    router.push(`/group/${chat.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {showSearch ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search characters..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearch(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.headerLeft}>
              <Image source={DAZE_LOGO} style={styles.appLogo} resizeMode="contain" />
              {streakCount > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {streakCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch(true)}>
                <Ionicons name="search" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/feed' as any)}>
                <Ionicons name="newspaper-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/group/create')}>
                <Ionicons name="add" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Story row */}
        {!search && (
          <View style={styles.storySection}>
            <FlatList
              horizontal
              data={sortedCharacters}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storyList}
              renderItem={({ item: char }) => {
                const mood = getCharacterMood(char.id);
                return (
                  <TouchableOpacity
                    onPress={() => showStory(char)}
                    style={styles.storyItem}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.storyRing, { borderColor: mood.color }]}>
                      <Avatar color={char.avatarColor} emoji={char.avatarEmoji} image={char.avatarImage} size={52} />
                    </View>
                    <Text style={styles.storyName} numberOfLines={1}>{char.name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Find Your Match quiz button */}
        {!search && (
          <TouchableOpacity
            style={styles.quizBtn}
            onPress={() => router.push('/quiz')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#A855F7', '#EC4899']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.quizBtnEmoji}>✨</Text>
            <View style={styles.quizBtnText}>
              <Text style={styles.quizBtnTitle}>Find Your Match</Text>
              <Text style={styles.quizBtnSub}>5 quick questions → your perfect bestie</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Daily vibe prompt */}
        {!search && dailyVibeChar && (
          <TouchableOpacity
            style={styles.vibeCard}
            onPress={() => handleCharacterPress(dailyVibeChar)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[dailyVibeChar.avatarColor + '33', dailyVibeChar.avatarColor + '11']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.vibeLabel}>✨ Today's vibe</Text>
            <Text style={styles.vibeName}>{dailyVibeChar.avatarEmoji} {dailyVibeChar.name}</Text>
            <Text style={styles.vibeRole}>{dailyVibeChar.archetype}</Text>
          </TouchableOpacity>
        )}

        {/* Featured character hero card */}
        {!search && featured && (
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => handleCharacterPress(featured)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[featured.avatarColor + '33', featured.avatarColor + '11', 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.heroLeft}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>⭐ Featured</Text>
              </View>
              <Text style={styles.heroName}>{featured.name}</Text>
              <Text style={styles.heroRole}>{featured.archetype} • {featured.city}</Text>
              <Text style={styles.heroTagline} numberOfLines={2}>"{featured.tagline}"</Text>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>Chat now</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setInfoChar(featured); }} activeOpacity={0.85}>
              <Avatar
                color={featured.avatarColor}
                emoji={featured.avatarEmoji}
                image={featured.avatarImage}
                size={80}
                showOnline
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Characters grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {search ? `Results for "${search}"` : 'Characters'}
          </Text>
          {filteredCharacters.length === 0 ? (
            <Text style={styles.emptySearch}>No characters found</Text>
          ) : (
            <View style={styles.grid}>
              {filteredCharacters.slice(search ? 0 : 1).map((char) => {
                const charIsPremium = char.isPremium;
                const isUnlocked = isPremiumUser || streakCount >= PREMIUM_UNLOCK_STREAK;
                const isLocked = charIsPremium && !isUnlocked;
                return (
                  <TouchableOpacity
                    key={char.id}
                    style={[styles.charCard, isLocked && styles.charCardLocked]}
                    onPress={() => handleCharacterPress(char)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[char.avatarColor + '22', 'transparent']}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); if (!isLocked) setInfoChar(char); }} activeOpacity={0.85}>
                      <View style={isLocked ? styles.lockedAvatarWrap : undefined}>
                        <Avatar color={char.avatarColor} emoji={char.avatarEmoji} image={char.avatarImage} size={44} showOnline={!isLocked} />
                        {isLocked && (
                          <View style={styles.lockOverlay}>
                            <Text style={styles.lockIcon}>🔒</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    <Text style={[styles.charName, isLocked && styles.lockedText]} numberOfLines={1}>{char.name}</Text>
                    <Text style={styles.charRole} numberOfLines={1}>{char.archetype}</Text>
                    {isLocked ? (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>👑 Premium</Text>
                      </View>
                    ) : (
                      <Text style={styles.charCity} numberOfLines={1}>{char.city}</Text>
                    )}
                    {favoriteIds.includes(char.id) && !isLocked && (
                      <View style={styles.favBadge}>
                        <Text style={{ fontSize: 8 }}>♥</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Group Scenes */}
        {!search && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Group Scenes 🎭</Text>
              <TouchableOpacity onPress={() => router.push('/group/create')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={scenarios}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scenarioList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.scenarioCard}
                  onPress={() => handleScenarioPress(item)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.bgElevated, colors.bgCard]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={styles.scenarioEmoji}>{item.emoji}</Text>
                  <Text style={styles.scenarioName}>{item.name}</Text>
                  <Text style={styles.scenarioDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.scenarioAvatars}>
                    {item.characterIds.slice(0, 3).map((cid) => {
                      const c = getCharacter(cid);
                      return c ? (
                        <View key={c.id} style={styles.scenarioAvatar}>
                          <Avatar color={c.avatarColor} emoji={c.avatarEmoji} image={c.avatarImage} size={22} />
                        </View>
                      ) : null;
                    })}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 3D Character Info Modal */}
      {infoChar && (
        <CharInfoModal
          character={infoChar}
          visible={!!infoChar}
          onClose={() => setInfoChar(null)}
          onChat={() => { setInfoChar(null); handleCharacterPress(infoChar); }}
        />
      )}

      {/* Story status overlay */}
      {storyChar && (
        <Animated.View style={[styles.storyOverlay, { opacity: storyFade }]} pointerEvents="none">
          <LinearGradient
            colors={[storyChar.avatarColor + 'CC', '#000000EE']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.storyOverlayContent}>
            <View style={[styles.storyOverlayRing, { borderColor: getCharacterMood(storyChar.id).color }]}>
              <Avatar color={storyChar.avatarColor} emoji={storyChar.avatarEmoji} image={storyChar.avatarImage} size={80} />
            </View>
            <Text style={styles.storyOverlayName}>{storyChar.name}</Text>
            <View style={[styles.storyMoodBadge, { backgroundColor: getCharacterMood(storyChar.id).color + '33', borderColor: getCharacterMood(storyChar.id).color + '66' }]}>
              <Text style={[styles.storyMoodText, { color: getCharacterMood(storyChar.id).color }]}>
                {getCharacterMood(storyChar.id).emoji} {getCharacterMood(storyChar.id).label}
              </Text>
            </View>
            <Text style={styles.storyOverlayStatus}>{getCharacterStatus(storyChar.id)}</Text>
          </View>
        </Animated.View>
      )}
      <OnboardingTutorial
        visible={showTutorial}
        onDone={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appLogo: {
    width: 110,
    height: 55,
  },
  streakBadge: {
    backgroundColor: '#FF922B18',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FF922B33',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF922B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: spacing.xs,
    borderRadius: 10,
  },
  // Search bar
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
  },
  cancelText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  scroll: {
    paddingTop: spacing.lg,
  },
  // Daily vibe
  vibeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  vibeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  vibeName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vibeRole: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  // Hero card
  heroCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroLeft: {
    flex: 1,
    marginRight: spacing.lg,
  },
  heroBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroRole: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  heroTagline: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
  },
  heroCtaText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAll: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  emptySearch: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  // Character grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  charCard: {
    width: '47.5%',
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'flex-start',
    overflow: 'hidden',
    position: 'relative',
  },
  charName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontSize: 15,
  },
  charRole: {
    ...typography.small,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  charCity: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 1,
  },
  favBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    color: '#FF6B6B',
  },
  charCardLocked: {
    opacity: 0.75,
  },
  lockedAvatarWrap: {
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { fontSize: 18 },
  lockedText: { color: colors.textMuted },
  premiumBadge: {
    backgroundColor: '#FF922B18',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#FF922B33',
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF922B',
  },
  // Story row
  storySection: {
    marginBottom: spacing.md,
  },
  storyList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    gap: 5,
    width: 64,
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  storyName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Quiz button
  quizBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  quizBtnEmoji: {
    fontSize: 24,
  },
  quizBtnText: {
    flex: 1,
  },
  quizBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  quizBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  // Story overlay
  storyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  storyOverlayContent: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  storyOverlayRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    marginBottom: 4,
  },
  storyOverlayName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  storyMoodBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
  },
  storyMoodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  storyOverlayStatus: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
  },
  // Scenario
  scenarioList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  scenarioCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: spacing.lg,
    width: 160,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  scenarioEmoji: {
    fontSize: 26,
    marginBottom: spacing.sm,
  },
  scenarioName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  scenarioDesc: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  scenarioAvatars: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  scenarioAvatar: {
    marginLeft: -4,
  },
});
