import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../store/useUserStore';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing } from 'react-native-reanimated';

const DAZE_LOGO = require('../../assets/daze-logo.png');

export default function SplashScreen() {
  const router = useRouter();
  const loggedIn = useUserStore((s) => s.loggedIn);
  const onboarded = useUserStore((s) => s.onboarded);

  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSequence(
      withTiming(1.08, { duration: 400, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 })
    );
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    const timer = setTimeout(() => {
      if (!loggedIn) {
        router.replace('/auth/login');
      } else if (onboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/name');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [loggedIn, onboarded]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0010', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Glow behind logo */}
      <LinearGradient
        colors={[colors.primary + '30', colors.accent + '18', 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image source={DAZE_LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        characters who actually get you ✨
      </Animated.Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>from</Text>
        <Text style={styles.footerBrand}>stealth labs ✦</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    height: 300,
    borderRadius: 200,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 240,
    height: 240,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  footerText: {
    ...typography.small,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footerBrand: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
});
