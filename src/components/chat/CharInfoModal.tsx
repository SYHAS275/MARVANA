import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Character } from '../../types';
import { Avatar } from '../common/Avatar';
import { colors } from '../../theme/colors';

const { width: SW, height: SH } = Dimensions.get('window');

interface CharInfoModalProps {
  character: Character;
  visible: boolean;
  onClose: () => void;
  onChat?: () => void;
  messageCount?: number;
}

function getLevel(count: number) {
  if (count >= 50) return { label: 'Soul Connection', emoji: '✨', color: '#A855F7', n: 4 };
  if (count >= 25) return { label: 'Trusted Friend',  emoji: '💜', color: '#A855F7', n: 3 };
  if (count >= 10) return { label: 'Growing Bond',    emoji: '💛', color: '#FFD600', n: 2 };
  return               { label: 'New Acquaintance',   emoji: '👋', color: '#06B6D4', n: 1 };
}

const STATS: { key: keyof Character['personality']; emoji: string; label: string }[] = [
  { key: 'humor',     emoji: '😂', label: 'Humor'    },
  { key: 'warmth',    emoji: '❤️', label: 'Warmth'   },
  { key: 'energy',    emoji: '⚡', label: 'Energy'   },
  { key: 'sarcasm',   emoji: '😏', label: 'Sarcasm'  },
  { key: 'wisdom',    emoji: '🧠', label: 'Wisdom'   },
  { key: 'desiMeter', emoji: '🌶️', label: 'Desi'     },
];

export function CharInfoModal({
  character, visible, onClose, onChat, messageCount = 0,
}: CharInfoModalProps) {
  const slideAnim  = useRef(new Animated.Value(SH)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const lv = getLevel(messageCount);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const c = character.avatarColor;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Dim backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

        {/* ── HERO ──────────────────────────────────────────── */}
        <LinearGradient
          colors={[c + 'FF', c + 'BB', c + '44', '#0A0A0A']}
          style={styles.hero}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        >
          {/* Decorative background rings */}
          <View style={[styles.bgRing, { width: SW * 0.9, height: SW * 0.9, borderRadius: SW * 0.45, borderColor: '#ffffff09', top: -SW * 0.3 }]} />
          <View style={[styles.bgRing, { width: SW * 0.6, height: SW * 0.6, borderRadius: SW * 0.3, borderColor: '#ffffff0d', top: -SW * 0.1 }]} />

          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.onlinePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online now</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar rings */}
          <View style={styles.avatarZone}>
            <View style={[styles.ringOuter, { borderColor: c + '22', shadowColor: c }]} />
            <View style={[styles.ringMid,   { borderColor: c + '55' }]} />
            <View style={[styles.ringInner, { borderColor: '#ffffffCC', shadowColor: c }]}>
              <Avatar color={c} emoji={character.avatarEmoji} image={character.avatarImage} size={72} name={character.name} />
            </View>
          </View>

          {/* Identity */}
          <Text style={styles.name}>{character.name}</Text>
          <View style={[styles.archetypeChip, { backgroundColor: c + '33', borderColor: c + '66' }]}>
            <Text style={[styles.archetypeText, { color: '#fff' }]}>{character.archetype}</Text>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaText}>{character.city}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaPill}>
              <Ionicons name="sparkles-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaText}>{character.age} yrs</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={[styles.metaPill, { backgroundColor: lv.color + '33', borderColor: lv.color + '55' }]}>
              <Text style={styles.metaText}>{lv.emoji} Lv.{lv.n} {lv.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── SCROLLABLE BODY ───────────────────────────────── */}
        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Tagline */}
          <View style={[styles.taglineCard, { borderColor: c + '44' }]}>
            <LinearGradient colors={[c + '18', c + '08']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.quoteIcon}>"</Text>
            <Text style={styles.taglineText}>{character.tagline}</Text>
          </View>

          {/* About */}
          <SectionHeader label="About" color={c} />
          <Text style={styles.bio}>{character.backstory}</Text>

          {/* Personality */}
          <SectionHeader label="Personality" color={c} />
          <View style={styles.statsGrid}>
            {STATS.map(({ key, emoji, label }) => {
              const val = character.personality[key];
              const pct = val / 10;
              return (
                <View key={key} style={styles.statTile}>
                  <LinearGradient
                    colors={[c + '28', c + '10']}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  {/* Top accent bar */}
                  <View style={[styles.tileAccent, { backgroundColor: c, width: `${pct * 100}%` as any }]} />
                  <Text style={styles.tileEmoji}>{emoji}</Text>
                  <Text style={[styles.tileNum, { color: c }]}>{val}</Text>
                  <Text style={styles.tileLabel}>{label}</Text>
                  {/* Mini dot track */}
                  <View style={styles.miniDots}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.miniDot,
                          i < Math.round(val / 2)
                            ? { backgroundColor: c }
                            : { backgroundColor: 'rgba(255,255,255,0.1)' },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Vibes */}
          <SectionHeader label="Vibes With" color={c} />
          <View style={styles.vibeRow}>
            {[
              ...character.culturalDNA.food.slice(0, 2).map(f => ({ icon: '🍽️', text: f })),
              ...character.culturalDNA.references.slice(0, 3).map(r => ({ icon: '✦', text: r })),
              ...character.culturalDNA.festivals.slice(0, 1).map(f => ({ icon: '🎉', text: f })),
            ].map((item, i) => (
              <View key={i} style={[styles.vibePill, { borderColor: c + '44' }]}>
                <LinearGradient colors={[c + '18', 'transparent']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Text style={styles.vibePillText}>{item.icon} {item.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* ── CHAT CTA ──────────────────────────────────────── */}
        {onChat && (
          <View style={styles.ctaBar}>
            <TouchableOpacity onPress={onChat} activeOpacity={0.85} style={{ flex: 1 }}>
              <LinearGradient colors={[c, c + 'AA']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.ctaText}>Chat with {character.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom handle */}
        <View style={styles.handle} />
      </Animated.View>
    </Modal>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SH * 0.94,
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 30,
  },
  handle: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 8,
  },

  // ── HERO ─────────────────────────────────────────────────
  hero: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  bgRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  onlineDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  onlineText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar rings
  avatarZone: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120, height: 120,
  },
  ringOuter: {
    position: 'absolute',
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  ringMid: {
    position: 'absolute',
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 1.5,
  },
  ringInner: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },

  // Identity
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  archetypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  archetypeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  metaDot: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  metaText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // ── BODY ─────────────────────────────────────────────────
  body: { paddingHorizontal: 20, paddingTop: 4 },

  taglineCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  quoteIcon: {
    fontSize: 32,
    lineHeight: 28,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '900',
    marginTop: -4,
  },
  taglineText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 23,
    marginBottom: 20,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── PERSONALITY 3-COL GRID ────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  statTile: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 18,
    paddingTop: 5,
    paddingBottom: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 2,
  },
  tileAccent: {
    height: 3,
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
    opacity: 0.9,
  },
  tileEmoji: { fontSize: 20, lineHeight: 24 },
  tileNum: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 34,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  miniDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
  },
  miniDot: {
    width: 5, height: 5, borderRadius: 3,
  },

  // ── VIBES ────────────────────────────────────────────────
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  vibePill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  vibePillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // ── CTA ──────────────────────────────────────────────────
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
});
