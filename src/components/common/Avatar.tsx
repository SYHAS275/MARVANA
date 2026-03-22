import React from 'react';
import { View, Text, StyleSheet, Image, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AvatarProps {
  color: string;
  emoji: string;
  image?: ImageSourcePropType;
  size?: number;
  showOnline?: boolean;
  name?: string;
}

// Generate a slightly lighter/darker shade for gradient
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

export function Avatar({ color, emoji, image, size = 44, showOnline, name }: AvatarProps) {
  const fontSize = size * 0.48;
  const onlineDot = size * 0.26;

  return (
    <View style={{ width: size, height: size }}>
      {image ? (
        <Image
          source={image}
          accessibilityLabel={name ? `${name} avatar` : 'Avatar'}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <LinearGradient
          colors={[lighten(color, 30), color, lighten(color, -40)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={{ fontSize, lineHeight: fontSize * 1.2 }}>{emoji}</Text>
        </LinearGradient>
      )}

      {showOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: onlineDot,
              height: onlineDot,
              borderRadius: onlineDot / 2,
              borderWidth: size > 40 ? 2.5 : 2,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  image: {
    resizeMode: 'cover',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#00A884',
    borderColor: '#111B21',
  },
});
