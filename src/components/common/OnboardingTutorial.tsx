import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'daze:tutorial_done';
const { width: SW, height: SH } = Dimensions.get('window');

export async function hasDoneTutorial(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TUTORIAL_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markTutorialDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
  } catch {}
}

interface Step {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    emoji: '🤖',
    title: 'Meet Your AI Besties',
    body: 'Tap any character on the Discover tab to start chatting. Each one has a unique vibe and personality!',
  },
  {
    emoji: '🔥',
    title: 'Build Your Streak',
    body: 'Chat daily to keep your streak alive. Hit 3, 7, 14 day milestones for bonus coins and unlocks!',
  },
  {
    emoji: '🪙',
    title: 'Earn Coins',
    body: 'You earn 2 coins for every message. Use them for premium characters, wallpapers, and more.',
  },
  {
    emoji: '👥',
    title: 'Connect with Friends',
    body: 'Tap the people icon in Chats to find and DM real users. You can also do group chats with AI characters!',
  },
  {
    emoji: '📖',
    title: 'Post Stories',
    body: 'Share 24-hour stories that disappear. Tap the book icon in Chats to see and post stories.',
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function OnboardingTutorial({ visible, onDone }: Props) {
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start();
    }
  }, [visible]);

  const animateStep = (next: number) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideY.setValue(40);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      animateStep(step + 1);
    } else {
      handleDone();
    }
  };

  const handleDone = async () => {
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
      await markTutorialDone();
      onDone();
    });
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleDone}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: slideY }] }]}>
          <LinearGradient
            colors={['#A855F722', '#EC489911']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          {/* Content */}
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            {!isLast && (
              <TouchableOpacity onPress={handleDone} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <LinearGradient
                colors={['#A855F7', '#EC4899']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.nextText}>
                {isLast ? 'Let\'s Go! 🚀' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#0D0D0D',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#A855F733',
    overflow: 'hidden',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive: { width: 20, backgroundColor: '#A855F7' },
  emoji: { fontSize: 56, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
  body: { fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%', justifyContent: 'center' },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16 },
  skipText: { color: '#666', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1, borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', overflow: 'hidden',
  },
  nextText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
