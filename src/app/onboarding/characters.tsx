import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../store/useUserStore';
import { characters } from '../../data/characters';
import { Avatar } from '../../components/common/Avatar';
import { GradientButton } from '../../components/common/GradientButton';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

// Haptics
let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}
const hapticSelect = () => { try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Medium); } catch {} };

export default function CharacterSelectionScreen() {
  const router = useRouter();
  const setFavoriteCharacters = useUserStore((s) => s.setFavoriteCharacters);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const [selected, setSelected] = useState<string[]>([]);
  const scaleAnims = useRef<Record<string, Animated.Value>>({});

  // Initialize scale anims
  characters.forEach((c) => {
    if (!scaleAnims.current[c.id]) {
      scaleAnims.current[c.id] = new Animated.Value(1);
    }
  });

  const toggleCharacter = (id: string) => {
    const anim = scaleAnims.current[id];
    if (anim) {
      Animated.sequence([
        Animated.spring(anim, { toValue: 0.9, useNativeDriver: true, speed: 40 }),
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    }
    hapticSelect();
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleGetStarted = () => {
    setFavoriteCharacters(selected);
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const isValid = selected.length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary + '18', 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>Pick your squad</Text>
        <Text style={styles.subtitle}>These are the people in your phone now. Choose 2-3 who vibe with you.</Text>
        {selected.length > 0 && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>{selected.length}/3 selected</Text>
          </View>
        )}
      </View>

      <FlatList
        data={characters}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          const scaleAnim = scaleAnims.current[item.id] || new Animated.Value(1);
          return (
            <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
              <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected, isSelected && { borderColor: item.avatarColor }]}
                onPress={() => toggleCharacter(item.id)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <LinearGradient
                    colors={[item.avatarColor + '25', 'transparent']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                )}
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: item.avatarColor }]}>
                    <Text style={styles.check}>✓</Text>
                  </View>
                )}
                <Avatar color={item.avatarColor} emoji={item.avatarEmoji} image={item.avatarImage} size={56} showOnline />
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.archBadge, { backgroundColor: item.avatarColor + '18' }]}>
                  <Text style={[styles.archetype, { color: item.avatarColor }]}>{item.archetype}</Text>
                </View>
                <Text style={styles.city}>{item.city}</Text>
                <Text style={styles.tagline} numberOfLines={2}>{item.tagline}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListFooterComponent={<View style={{ height: 120 }} />}
      />

      <LinearGradient
        colors={['transparent', colors.bg, colors.bg]}
        style={styles.footer}
        pointerEvents="box-none"
      >
        <GradientButton
          title={isValid ? `Let's go! (${selected.length}/3) 🚀` : `Pick ${2 - selected.length} more character${selected.length === 1 ? '' : 's'}`}
          onPress={handleGetStarted}
          disabled={!isValid}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 30,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  selectedBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.primary + '22',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  selectedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardWrap: {
    width: '48%',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardSelected: {
    borderWidth: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  check: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontSize: 16,
  },
  archBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  archetype: {
    ...typography.small,
    fontWeight: '600',
  },
  city: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xxl,
    paddingBottom: 40,
    paddingTop: 40,
  },
});
