import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { getCharacter } from '../../data/characters';

export interface WrappedStats {
  totalMessages: number;
  topCharacterId: string | null;
  streakCount: number;
  coinsEarned: number;
  weekLabel: string; // e.g. "Mar 17–23"
}

interface Props {
  visible: boolean;
  stats: WrappedStats;
  onClose: () => void;
}

const STAT_CARDS = [
  { key: 'messages', emoji: '💬', label: 'Messages Sent' },
  { key: 'streak',   emoji: '🔥', label: 'Day Streak' },
  { key: 'coins',    emoji: '🪙', label: 'Coins Earned' },
];

export function WeeklyWrapped({ visible, stats, onClose }: Props) {
  const slide = useRef(new Animated.Value(80)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 70, friction: 9 }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(80);
      fade.setValue(0);
    }
  }, [visible]);

  const topChar = stats.topCharacterId ? getCharacter(stats.topCharacterId) : null;
  const statValues = [stats.totalMessages, stats.streakCount, stats.coinsEarned];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fade }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          {/* Header gradient */}
          <LinearGradient colors={['#A855F7', '#EC4899']} style={styles.headerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.weekLabel}>{stats.weekLabel}</Text>
            <Text style={styles.heading}>Your Weekly{'\n'}Wrapped ✨</Text>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Stat cards */}
            <View style={styles.statRow}>
              {STAT_CARDS.map((c, i) => (
                <View key={c.key} style={styles.statCard}>
                  <Text style={styles.statEmoji}>{c.emoji}</Text>
                  <Text style={styles.statNum}>{statValues[i]}</Text>
                  <Text style={styles.statLabel}>{c.label}</Text>
                </View>
              ))}
            </View>

            {/* Top character */}
            {topChar && (
              <View style={styles.topCharCard}>
                <LinearGradient
                  colors={[topChar.avatarColor + '33', topChar.avatarColor + '11']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                <Text style={styles.topCharEmoji}>{topChar.avatarEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.topCharLabel}>Most Chatted</Text>
                  <Text style={styles.topCharName}>{topChar.name}</Text>
                  <Text style={styles.topCharSub}>{topChar.archetype}</Text>
                </View>
                <Text style={styles.topCharBadge}>❤️</Text>
              </View>
            )}

            {/* Motivational message */}
            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>
                {stats.totalMessages >= 50
                  ? '"You literally live here. We respect it."'
                  : stats.totalMessages >= 20
                  ? '"Okay you\'re actually that person 💅"'
                  : '"Every convo counts. Keep it up! 🚀"'}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.closeBtnText}>Close Wrapped 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** Returns true if today is Sunday (day to show weekly wrapped) */
export function shouldShowWrapped(lastWrappedWeek: string | null): boolean {
  const now = new Date();
  const week = getWeekKey(now);
  return now.getDay() === 0 && lastWrappedWeek !== week;
}

export function getWeekKey(date: Date): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay() + 1); // Monday
  return start.toISOString().slice(0, 10);
}

export function getWeekLabel(date: Date): string {
  const end = new Date(date);
  end.setDate(date.getDate() - date.getDay() + 7); // Sunday
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay() + 1);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', overflow: 'hidden',
  },
  headerGrad: { padding: 28, paddingBottom: 32 },
  weekLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  heading: { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 38 },
  body: { padding: 20, gap: 16, paddingBottom: 8 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#111', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4,
  },
  statEmoji: { fontSize: 28 },
  statNum: { fontSize: 26, fontWeight: '900', color: colors.textPrimary },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  topCharCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#111', borderRadius: 18, padding: 16, overflow: 'hidden',
  },
  topCharEmoji: { fontSize: 42 },
  topCharLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  topCharName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  topCharSub: { fontSize: 13, color: colors.textSecondary },
  topCharBadge: { fontSize: 28 },
  quoteCard: { backgroundColor: '#111', borderRadius: 16, padding: 18 },
  quoteText: { fontSize: 16, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 24, textAlign: 'center' },
  closeBtn: {
    margin: 16, borderRadius: 18, paddingVertical: 16,
    alignItems: 'center', overflow: 'hidden',
  },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
