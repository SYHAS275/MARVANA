import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/useUserStore';
import {
  initiateCall, answerCall, endCall, getCallRecord, CallType,
} from '../../services/supabase';
import {
  initAgoraEngine, joinAgoraChannel, leaveAgoraChannel,
  setAgoraMuted, setAgoraSpeaker, setAgoraVideoEnabled,
  addAgoraListeners, removeAgoraListeners, userIdToAgoraUid,
} from '../../services/agora';

type CallState = 'ringing' | 'active' | 'ended' | 'declined';

function PulseRing({ size, delay, color }: { size: number; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.3, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallScreen() {
  const { userId, name, type, callId: incomingCallId, incoming } = useLocalSearchParams<{
    userId: string;
    name: string;
    type: CallType;
    callId?: string;
    incoming?: string;
  }>();
  const router = useRouter();
  const authSession = useUserStore((s) => s.authSession);
  const myId = useUserStore((s) => s.userId);

  const [callState, setCallState] = useState<CallState>('ringing');
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callId, setCallId] = useState<string | null>(incomingCallId ?? null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVideo = type === 'video';
  const isIncoming = incoming === 'true';

  // Determine avatar color from name
  const hue = (name || '?').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
  const avatarColor = `hsl(${hue},55%,38%)`;
  const bgColor = `hsl(${hue},40%,8%)`;
  const ringColor = `hsl(${hue},60%,55%)`;
  const letter = (name || '?')[0]?.toUpperCase();

  useEffect(() => {
    if (!authSession || !myId) return;

    if (!isIncoming) {
      // Outgoing: create call record
      initiateCall(authSession.accessToken, myId, userId, type ?? 'voice')
        .then((id) => setCallId(id))
        .catch(() => setCallState('ended'));
    } else if (incomingCallId) {
      // Incoming: answer it
      answerCall(authSession.accessToken, incomingCallId)
        .then(() => {
          setCallState('active');
          startTimer();
        })
        .catch(() => setCallState('ended'));
    }

    return () => {
      clearInterval(timerRef.current!);
      clearInterval(pollRef.current!);
    };
  }, []);

  // Poll call record to detect answer/decline
  useEffect(() => {
    if (!callId || !authSession || isIncoming) return;

    pollRef.current = setInterval(async () => {
      const record = await getCallRecord(authSession.accessToken, callId);
      if (!record) return;
      if (record.status === 'active' && callState === 'ringing') {
        setCallState('active');
        startTimer();
      } else if (record.status === 'declined' || record.status === 'ended' || record.status === 'missed') {
        setCallState(record.status === 'declined' ? 'declined' : 'ended');
        clearInterval(pollRef.current!);
      }
    }, 2000);

    // Auto-miss after 30s if unanswered
    const missTimeout = setTimeout(() => {
      if (callState === 'ringing') {
        handleHangup('missed');
      }
    }, 30_000);

    return () => {
      clearInterval(pollRef.current!);
      clearTimeout(missTimeout);
    };
  }, [callId]);

  const startTimer = async () => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    // Join the Agora channel — both callers use the callId as the channel name
    if (callId && myId) {
      try {
        await initAgoraEngine();
        addAgoraListeners({
          onUserOffline: () => handleHangup('ended'),
          onError: (code) => console.warn('[Agora] Error code:', code),
        });
        await joinAgoraChannel(callId, userIdToAgoraUid(myId), isVideo);
      } catch (e) {
        console.warn('[Agora] Could not join channel:', e);
      }
    }
  };

  const handleHangup = async (status?: 'declined' | 'ended' | 'missed') => {
    clearInterval(timerRef.current!);
    clearInterval(pollRef.current!);
    removeAgoraListeners();
    await leaveAgoraChannel();
    if (authSession && callId) {
      const s = status ?? 'ended';
      await endCall(authSession.accessToken, callId, s).catch(() => {});
    }
    setCallState('ended');
    setTimeout(() => router.back(), 800);
  };

  const statusLabel = () => {
    if (callState === 'ringing') return isIncoming ? 'Incoming call…' : 'Calling…';
    if (callState === 'active') return formatDuration(duration);
    if (callState === 'declined') return 'Call declined';
    return 'Call ended';
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* Top info */}
        <View style={styles.topSection}>
          <Text style={styles.callTypeLabel}>
            {isVideo ? '📹 Video Call' : '📞 Voice Call'}
          </Text>
        </View>

        {/* Avatar with pulse */}
        <View style={styles.centerSection}>
          <View style={styles.pulseContainer}>
            {callState === 'ringing' && (
              <>
                <PulseRing size={120} delay={0} color={ringColor} />
                <PulseRing size={120} delay={600} color={ringColor} />
                <PulseRing size={120} delay={1200} color={ringColor} />
              </>
            )}
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarLetter}>{letter}</Text>
            </View>
          </View>

          <Text style={styles.callerName}>{name || 'Unknown'}</Text>
          <Text style={[
            styles.statusLabel,
            callState === 'active' && styles.statusActive,
            (callState === 'ended' || callState === 'declined') && styles.statusEnded,
          ]}>
            {statusLabel()}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {callState === 'active' ? (
            <>
              <View style={styles.controlRow}>
                <ControlBtn
                  icon={muted ? 'mic-off' : 'mic'}
                  label={muted ? 'Unmute' : 'Mute'}
                  active={muted}
                  onPress={() => {
                    const next = !muted;
                    setMuted(next);
                    setAgoraMuted(next);
                  }}
                />
                <ControlBtn
                  icon={speaker ? 'volume-high' : 'volume-medium'}
                  label="Speaker"
                  active={speaker}
                  onPress={() => {
                    const next = !speaker;
                    setSpeaker(next);
                    setAgoraSpeaker(next);
                  }}
                />
                {isVideo && (
                  <ControlBtn
                    icon={videoOff ? 'videocam-off' : 'videocam'}
                    label="Video"
                    active={videoOff}
                    onPress={() => {
                      const next = !videoOff;
                      setVideoOff(next);
                      setAgoraVideoEnabled(!next);
                    }}
                  />
                )}
              </View>

              <TouchableOpacity style={styles.hangupBtn} onPress={() => handleHangup()}>
                <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </>
          ) : callState === 'ringing' && isIncoming ? (
            // Incoming call controls
            <View style={styles.incomingActions}>
              <View style={styles.incomingActionWrap}>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleHangup('declined')}>
                  <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
                <Text style={styles.actionLabel}>Decline</Text>
              </View>
              <View style={styles.incomingActionWrap}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => {
                  if (authSession && callId) {
                    answerCall(authSession.accessToken, callId).then(() => {
                      setCallState('active');
                      startTimer();
                    });
                  }
                }}>
                  <Ionicons name="call" size={30} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.actionLabel}>Accept</Text>
              </View>
            </View>
          ) : callState === 'ringing' ? (
            // Outgoing ringing
            <TouchableOpacity style={styles.hangupBtn} onPress={() => handleHangup()}>
              <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function ControlBtn({ icon, label, active, onPress }: {
  icon: any; label: string; active: boolean; onPress: () => void;
}) {
  return (
    <View style={ctrl.wrap}>
      <TouchableOpacity
        style={[ctrl.btn, active && ctrl.btnActive]}
        onPress={onPress}
      >
        <Ionicons name={icon} size={22} color={active ? '#000' : '#fff'} />
      </TouchableOpacity>
      <Text style={ctrl.label}>{label}</Text>
    </View>
  );
}

const ctrl = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  btn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnActive: { backgroundColor: '#fff' },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  topSection: { alignItems: 'center', paddingTop: 20 },
  callTypeLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },

  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  pulseContainer: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 48, fontWeight: '800', color: '#fff' },
  callerName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  statusLabel: { fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  statusActive: { color: '#4ADE80', fontWeight: '700' },
  statusEnded: { color: 'rgba(255,100,100,0.8)' },

  controls: {
    paddingBottom: 40,
    alignItems: 'center',
    gap: 32,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  hangupBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },

  // Incoming call
  incomingActions: {
    flexDirection: 'row',
    gap: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingActionWrap: { alignItems: 'center', gap: 10 },
  declineBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
