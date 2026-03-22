import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallRecord } from '../../services/supabase';

interface Props {
  call: CallRecord | null;
  callerName: string;
  onAccept: (call: CallRecord) => void;
  onDecline: (call: CallRecord) => void;
}

function PulseRing({ size, delay, color }: { size: number; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.45, 0.2, 0] });
  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 2, borderColor: color,
      opacity, transform: [{ scale }],
    }} />
  );
}

export function IncomingCall({ call, callerName, onAccept, onDecline }: Props) {
  const slideY = useRef(new Animated.Value(-200)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (call) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: -200, duration: 250, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [call]);

  if (!call) return null;

  const hue = (callerName || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const avatarColor = `hsl(${hue},55%,38%)`;
  const letter = (callerName || '?')[0]?.toUpperCase();
  const isVideo = call.type === 'video';

  return (
    <Modal transparent visible={!!call} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.banner, { opacity: fade, transform: [{ translateY: slideY }] }]}>
          <View style={styles.left}>
            <View style={styles.avatarWrap}>
              <PulseRing size={46} delay={0} color={avatarColor} />
              <PulseRing size={46} delay={500} color={avatarColor} />
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarLetter}>{letter}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.name} numberOfLines={1}>{callerName}</Text>
              <Text style={styles.sub}>{isVideo ? '📹 Incoming video call' : '📞 Incoming voice call'}</Text>
            </View>
          </View>
          <View style={styles.btns}>
            <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(call)}>
              <Ionicons name="call" size={20} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(call)}>
              <Ionicons name="call" size={20} color="#fff" />
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
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: 12,
    pointerEvents: 'box-none',
  } as any,
  banner: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2C2C2E',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '800', color: '#fff' },
  name: { fontSize: 15, fontWeight: '700', color: '#fff', maxWidth: 160 },
  sub: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  btns: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },
});
