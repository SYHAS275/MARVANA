import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

interface StreakModalProps {
  visible: boolean;
  streakCount: number;
  onClose: () => void;
}

const MILESTONES: Record<number, { emoji: string; title: string; subtitle: string; colors: [string, string] }> = {
  3:   { emoji: '🔥', title: '3 Day Streak!',   subtitle: 'You\'re warming up!',         colors: ['#F97316', '#EF4444'] },
  7:   { emoji: '⚡', title: 'One Week!',        subtitle: 'You\'re on fire bestie',      colors: ['#FFD600', '#F97316'] },
  14:  { emoji: '💜', title: '2 Week Streak!',   subtitle: 'You\'re absolutely hooked',   colors: ['#A855F7', '#EC4899'] },
  30:  { emoji: '👑', title: '30 Days!',         subtitle: 'Royalty. Pure royalty.',       colors: ['#FFD600', '#A855F7'] },
  60:  { emoji: '🌟', title: '60 Day Legend!',   subtitle: 'You live here basically',      colors: ['#06B6D4', '#A855F7'] },
  100: { emoji: '🏆', title: '100 DAYS!',        subtitle: 'You are the main character',   colors: ['#FFD600', '#EC4899'] },
};

export function StreakModal({ visible, streakCount, onClose }: StreakModalProps) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  const milestone = MILESTONES[streakCount];
  if (!milestone) return null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(ring, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        ),
      ]).start();
    } else {
      scale.setValue(0.6);
      fade.setValue(0);
      ring.setValue(0);
    }
  }, [visible]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fade }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <LinearGradient colors={milestone.colors} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

          {/* Pulsing ring */}
          <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity, borderColor: milestone.colors[1] }]} />

          <Text style={styles.emoji}>{milestone.emoji}</Text>
          <Text style={styles.title}>{milestone.title}</Text>
          <Text style={styles.subtitle}>{milestone.subtitle}</Text>

          <View style={styles.countRow}>
            <Text style={styles.countNum}>{streakCount}</Text>
            <Text style={styles.countLabel}>day streak 🔥</Text>
          </View>

          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Let's go! 🚀</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    width: 300, borderRadius: 28, padding: 32,
    alignItems: 'center', overflow: 'hidden',
  },
  ring: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 2, top: 20,
  },
  emoji: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 20, marginBottom: 24 },
  countNum: { fontSize: 52, fontWeight: '900', color: '#fff' },
  countLabel: { fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  btn: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20,
    paddingHorizontal: 32, paddingVertical: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
