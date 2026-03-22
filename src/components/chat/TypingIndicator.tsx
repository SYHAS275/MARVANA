import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export function TypingIndicator() {
  const dot1 = useSharedValue(0.4);
  const dot2 = useSharedValue(0.4);
  const dot3 = useSharedValue(0.4);

  useEffect(() => {
    const anim = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 350 }),
            withTiming(0.4, { duration: 350 })
          ),
          -1,
          true
        )
      );
    dot1.value = anim(0);
    dot2.value = anim(200);
    dot3.value = anim(400);
  }, []);

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value, transform: [{ scale: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value, transform: [{ scale: dot2.value }] }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value, transform: [{ scale: dot3.value }] }));

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Animated.View style={[styles.dot, style1]} />
        <Animated.View style={[styles.dot, style2]} />
        <Animated.View style={[styles.dot, style3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignItems: 'flex-end',
  },
  bubble: {
    backgroundColor: colors.bubbleAI,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 38,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
