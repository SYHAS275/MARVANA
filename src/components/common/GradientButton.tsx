import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'accent';
}

export function GradientButton({ title, onPress, disabled, style, variant = 'primary' }: GradientButtonProps) {
  const gradColors: [string, string] = variant === 'accent'
    ? ['#E59A3E', '#D97F2B']
    : [colors.gradientStart, colors.gradientEnd];

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8} style={style}>
      <LinearGradient
        colors={disabled ? ['#2A3942', '#2A3942'] as [string, string] : gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    ...typography.bodyBold,
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
