import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

function Dot({ delay }: { delay: number }) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(bounce.value, [0, 1], [0, -10]) }],
    opacity: interpolate(bounce.value, [0, 1], [0.5, 1]),
  }));

  return (
    <Animated.View style={[styles.dot, style]}>
      <LinearGradient
        colors={['#A855F7', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dotGradient}
      />
    </Animated.View>
  );
}

function ShimmerBar() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withDelay(
      300,
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-width * 0.6, width * 0.6]) }],
  }));

  return (
    <View style={styles.barWrap}>
      <View style={styles.barBg}>
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(168,85,247,0.6)', 'rgba(236,72,153,0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

export default function MarvanaLoader() {
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(30);
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(20);
  const dotsOpacity = useSharedValue(0);

  useEffect(() => {
    // Title slides in
    titleOpacity.value = withDelay(100, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    titleY.value = withDelay(100, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
    // Tagline fades in
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    taglineY.value = withDelay(500, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }));
    // Dots fade in
    dotsOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  const dotsStyle = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Subtle background glow */}
      <View style={styles.glow} />

      {/* MARVANA title */}
      <Animated.View style={titleStyle}>
        <Text style={styles.title}>MARVANA</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={taglineStyle}>
        <Text style={styles.tagline}>AI CHARACTERS THAT FEEL REAL</Text>
      </Animated.View>

      {/* Bouncing dots */}
      <Animated.View style={[styles.dotsRow, dotsStyle]}>
        <Dot delay={0} />
        <Dot delay={180} />
        <Dot delay={360} />
      </Animated.View>

      {/* Shimmer progress bar */}
      <ShimmerBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168,85,247,0.08)',
    top: '35%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: 6,
    color: '#ffffff',
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.3)',
    marginTop: -8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dotGradient: {
    flex: 1,
  },
  barWrap: {
    marginTop: 12,
    width: width * 0.5,
    overflow: 'hidden',
  },
  barBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
});
