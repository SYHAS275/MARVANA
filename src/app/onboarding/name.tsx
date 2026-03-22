import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';

const DAZE_LOGO = require('../../../assets/daze-logo.png');
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring } from 'react-native-reanimated';
import { useUserStore } from '../../store/useUserStore';
import { GradientButton } from '../../components/common/GradientButton';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export default function NameScreen() {
  const router = useRouter();
  const currentName = useUserStore((s) => s.name);
  const setName = useUserStore((s) => s.setName);
  const [name, setNameLocal] = useState(currentName);

  const headOpacity = useSharedValue(0);
  const headY = useSharedValue(30);
  const inputOpacity = useSharedValue(0);

  useEffect(() => {
    headOpacity.value = withTiming(1, { duration: 500 });
    headY.value = withSpring(0, { damping: 15 });
    inputOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const headStyle = useAnimatedStyle(() => ({
    opacity: headOpacity.value,
    transform: [{ translateY: headY.value }],
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
  }));

  const isValid = name.trim().length >= 2;

  const handleNext = () => {
    if (!isValid) return;
    setName(name.trim());
    router.push('/onboarding/characters');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Subtle bg gradient */}
      <LinearGradient
        colors={[colors.primary + '22', colors.accent + '11', 'transparent']}
        style={styles.bgGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Animated.View style={[styles.content, headStyle]}>
          <Image source={DAZE_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>welcome to daze ✨</Text>
          <Text style={styles.subtitle}>
            AI characters jo bolte hain teri bhasha mein{'\n'}Desi vibes, real drama, no filter ✨
          </Text>
        </Animated.View>

        <Animated.View style={[styles.inputSection, inputStyle]}>
          <Text style={styles.label}>What should we call you?</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Apna naam daal..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setNameLocal}
              autoFocus
              maxLength={20}
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        </Animated.View>

        <View style={styles.bottom}>
          <GradientButton
            title={isValid ? "Main ready hoon 🚀" : "Let's Go →"}
            onPress={handleNext}
            disabled={!isValid}
          />
          <Text style={styles.hint}>Minimum 2 characters</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 32,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },
  inputSection: {
    marginTop: -20,
  },
  label: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  inputWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
  },
  input: {
    ...typography.h3,
    color: colors.textPrimary,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
    textAlign: 'center',
    fontSize: 20,
  },
  bottom: {
    paddingBottom: 40,
    alignItems: 'center',
    gap: spacing.md,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
  },
});
