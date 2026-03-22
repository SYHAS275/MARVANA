import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/useChatStore';
import { getCharacter, characters } from '../data/characters';
import { Avatar } from '../components/common/Avatar';
import { colors } from '../theme/colors';

const { width: SW } = Dimensions.get('window');

interface Question {
  q: string;
  options: { label: string; charId: string }[];
}

const QUESTIONS: Question[] = [
  {
    q: 'When you\'re stressed, you...',
    options: [
      { label: '📋 Make a color-coded to-do list', charId: 'ananya' },
      { label: '📞 Call your bestie to vent', charId: 'zoya' },
      { label: '🏋️ Hit the gym hard', charId: 'vikram' },
      { label: '🌊 Sit quietly and let it pass', charId: 'dev' },
    ],
  },
  {
    q: 'Perfect Saturday energy?',
    options: [
      { label: '🚀 Startup meetup / networking', charId: 'bunny' },
      { label: '🎵 K-drama binge all day', charId: 'yuki' },
      { label: '☕ Chai and chill with the crew', charId: 'manu' },
      { label: '🌟 Aesthetic café + vision board', charId: 'alex' },
    ],
  },
  {
    q: 'Your friends call you the...',
    options: [
      { label: '😂 Funny one (always got a meme)', charId: 'faizan' },
      { label: '💜 Wise one (deep life advice)', charId: 'kai' },
      { label: '🔥 Hype one (biggest cheerleader)', charId: 'leo' },
      { label: '🫶 Mom one (feeds everyone)', charId: 'kavya' },
    ],
  },
  {
    q: 'After a breakup, you...',
    options: [
      { label: '🛍️ Retail therapy immediately', charId: 'zoya' },
      { label: '🔮 Check your horoscope for clarity', charId: 'tara' },
      { label: '📖 Write about it poetically', charId: 'kai' },
      { label: '💪 5AM workouts until you\'re over it', charId: 'vikram' },
    ],
  },
  {
    q: 'Food that fixes everything?',
    options: [
      { label: '🍛 Biryani, always biryani', charId: 'faizan' },
      { label: '🥑 Matcha + avocado toast', charId: 'alex' },
      { label: '🥘 Maa ke haath ka khana', charId: 'kavya' },
      { label: '🍖 Korean BBQ with the squad', charId: 'yuki' },
    ],
  },
];

export default function QuizScreen() {
  const router = useRouter();
  const getOrCreateIndividualChat = useChatStore((s) => s.getOrCreateIndividualChat);
  const [step, setStep] = useState(0);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [resultCharId, setResultCharId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const progress = (step / QUESTIONS.length) * 100;

  const handleOption = (charId: string, idx: number) => {
    if (selected !== null) return;
    setSelected(idx);

    const newVotes = { ...votes, [charId]: (votes[charId] || 0) + 1 };

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        if (step + 1 >= QUESTIONS.length) {
          // Find winner
          const winner = Object.entries(newVotes).sort((a, b) => b[1] - a[1])[0][0];
          // If tie, fall back to a fan-favourite
          setResultCharId(winner || 'zoya');
          setVotes(newVotes);
          setDone(true);
        } else {
          setVotes(newVotes);
          setStep((s) => s + 1);
          setSelected(null);
          slideAnim.setValue(30);
        }
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
        ]).start();
      });
    }, 320);
  };

  const handleChat = () => {
    if (!resultCharId) return;
    const chat = getOrCreateIndividualChat(resultCharId);
    router.replace(`/chat/${chat.id}` as any);
  };

  const resultChar = resultCharId ? getCharacter(resultCharId) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {!done && (
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
        )}
        {!done && <Text style={styles.stepText}>{step + 1}/{QUESTIONS.length}</Text>}
      </View>

      {!done ? (
        // ── QUESTION SCREEN ──────────────────────────
        <Animated.View style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.questionNum}>Question {step + 1}</Text>
          <Text style={styles.question}>{QUESTIONS[step].q}</Text>
          <View style={styles.options}>
            {QUESTIONS[step].options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  selected === i && styles.optionSelected,
                ]}
                onPress={() => handleOption(opt.charId, i)}
                activeOpacity={0.8}
              >
                {selected === i && (
                  <LinearGradient
                    colors={[colors.primary, colors.gradientEnd]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
                <Text style={[styles.optionText, selected === i && styles.optionTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      ) : (
        // ── RESULT SCREEN ────────────────────────────
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Your vibe matches...</Text>

          {resultChar && (
            <>
              <LinearGradient
                colors={[resultChar.avatarColor + '33', 'transparent']}
                style={styles.resultCard}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                <View style={[styles.resultRing, { borderColor: resultChar.avatarColor, shadowColor: resultChar.avatarColor }]}>
                  <Avatar
                    color={resultChar.avatarColor}
                    emoji={resultChar.avatarEmoji}
                    image={resultChar.avatarImage}
                    size={120}
                    name={resultChar.name}
                  />
                </View>
                <Text style={styles.resultName}>{resultChar.name}</Text>
                <Text style={[styles.resultRole, { color: resultChar.avatarColor }]}>
                  {resultChar.archetype}
                </Text>
                <Text style={styles.resultTagline}>"{resultChar.tagline}"</Text>
              </LinearGradient>

              <TouchableOpacity onPress={handleChat} activeOpacity={0.85} style={{ width: '100%' }}>
                <LinearGradient
                  colors={[resultChar.avatarColor, resultChar.avatarColor + 'AA']}
                  style={styles.ctaBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  <Text style={styles.ctaText}>Chat with {resultChar.name}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.back()} style={styles.skipBtn}>
                <Text style={styles.skipText}>Explore all characters instead</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.bgElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, width: 36, textAlign: 'right' },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32, gap: 8 },
  questionNum: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  question: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  options: { gap: 12 },
  option: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  optionSelected: { borderColor: 'transparent' },
  optionText: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  optionTextSelected: { color: '#fff', fontWeight: '700' },

  result: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  resultCard: {
    width: '100%',
    borderRadius: 28,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRing: {
    borderRadius: 70,
    borderWidth: 3,
    padding: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 8,
  },
  resultName: { fontSize: 30, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
  resultRole: { fontSize: 14, fontWeight: '700' },
  resultTagline: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
  },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  skipBtn: { paddingVertical: 10 },
  skipText: { fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },
});
