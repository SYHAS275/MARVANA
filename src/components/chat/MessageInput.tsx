import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, Pressable, Animated, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}
const hapticLight = () => { try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Light); } catch {} };

// ── Sticker packs ──────────────────────────────────────────────────────────
const STICKER_PACKS = [
  { id: 'happy',   label: '😄',  stickers: ['😄🎉', '🥳✨', '😍💜', '🤩🔥', '😊🌸', '💃🎊', '🙌😁', '✨🥰'] },
  { id: 'sad',     label: '😢',  stickers: ['😭💔', '🥺🙏', '😞😔', '💔😢', '🫂🥺', '😿🌧️', '😮‍💨💀', '🥹😮‍💨'] },
  { id: 'love',    label: '❤️',  stickers: ['❤️‍🔥💜', '🥰💕', '😘💋', '💑✨', '💌💝', '🫀❤️', '💜🌸', '🫦💋'] },
  { id: 'funny',   label: '😂',  stickers: ['💀😂', '🤣🫠', '😭💀', '🐒🤣', '🫣😂', '🤡💀', '😹🤣', '🦆💀'] },
  { id: 'desi',    label: '🇮🇳', stickers: ['🙏🤙', '😤💪', '🍛👌', '🤌✨', '🎭🤝', '🎪🇮🇳', '🥘🔥', '🫴💜'] },
  { id: 'vibe',    label: '✨',  stickers: ['☕📚', '🎧✨', '🌙💫', '🌊🏄', '🎨🖌️', '🦋🌸', '🕯️🫖', '🌿🎵'] },
  { id: 'shocked', label: '😱',  stickers: ['😱🫨', '🤯💥', '😳👀', '👁️👄👁️', '🫢😮', '🙀💀', '😲❓', '🤭😱'] },
  { id: 'cool',    label: '😎',  stickers: ['😎🤙', '💅✨', '🧊😎', '🕶️🔥', '👑😏', '🦁💪', '😌👑', '🤘😈'] },
];

interface MessageInputProps {
  onSend: (text: string) => void;
  onVoiceNote?: (uri: string) => void;
  onStickerSend?: (sticker: string) => void;
  disabled?: boolean;
  mentionableNames?: string[];
}

export function MessageInput({
  onSend, onVoiceNote, onStickerSend, disabled, mentionableNames = [],
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showStickers, setShowStickers] = useState(false);
  const [activePack, setActivePack] = useState(0);
  const MAX_RECORDING_SECONDS = 120;
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sendScale = useRef(new Animated.Value(1)).current;
  const sendRotation = useRef(new Animated.Value(0)).current;
  const sendPulse = useRef(new Animated.Value(1)).current;
  const sendPulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const hasText = text.trim().length > 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  // Pulse animation for send button when text is present
  useEffect(() => {
    if (hasText) {
      sendPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(sendPulse, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(sendPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      sendPulseLoop.current.start();
    } else {
      sendPulseLoop.current?.stop();
      sendPulse.setValue(1);
    }
    return () => {
      sendPulseLoop.current?.stop();
    };
  }, [hasText]);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const animateSendButton = () => {
    sendScale.setValue(1);
    sendRotation.setValue(0);
    Animated.parallel([
      Animated.spring(sendScale, {
        toValue: 1.4,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.timing(sendRotation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.spring(sendScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 12,
        }),
        Animated.timing(sendRotation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const sendRotationDeg = sendRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '30deg'],
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    hapticLight();
    animateSendButton();
    onSend(trimmed);
    setText('');
    setShowStickers(false);
  };

  const startRecording = async () => {
    if (disabled || !onVoiceNote) return;
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Allow microphone access to send voice messages.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      durationRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          if (d + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return d + 1;
          }
          return d + 1;
        });
      }, 1000);
    } catch (e) {
      console.warn('Recording start failed:', e);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri && recordingDuration >= 1) {
        onVoiceNote?.(uri);
      }
      setRecordingDuration(0);
    } catch (e) {
      console.warn('Recording stop failed:', e);
      recordingRef.current = null;
    }
  };

  const mentionMatch = text.match(/(?:^|\s)@([a-z0-9_]*)$/i);
  const mentionQuery = mentionMatch?.[1]?.toLowerCase() ?? null;
  const mentionCandidates = mentionQuery !== null
    ? mentionableNames.filter((n) => n.toLowerCase().startsWith(mentionQuery)).slice(0, 5)
    : [];

  const insertMention = (name: string) => {
    setText((prev) => prev.replace(/(?:^|\s)@([a-z0-9_]*)$/i, (match) => {
      const leadingSpace = match.startsWith(' ') ? ' ' : '';
      return `${leadingSpace}@${name} `;
    }));
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.wrapper}>
      {/* Mention suggestions */}
      {mentionCandidates.length > 0 && (
        <View style={styles.mentionList}>
          {mentionCandidates.map((name) => (
            <TouchableOpacity key={name} style={styles.mentionItem} onPress={() => insertMention(name)}>
              <Text style={styles.mentionText}>@{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sticker picker */}
      {showStickers && (
        <View style={styles.stickerPanel}>
          {/* Pack tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packTabs} contentContainerStyle={{ gap: 4, paddingHorizontal: spacing.sm }}>
            {STICKER_PACKS.map((pack, i) => (
              <TouchableOpacity
                key={pack.id}
                style={[styles.packTab, activePack === i && styles.packTabActive]}
                onPress={() => setActivePack(i)}
              >
                <Text style={styles.packTabEmoji}>{pack.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Sticker grid */}
          <View style={styles.stickerGrid}>
            {STICKER_PACKS[activePack].stickers.map((sticker) => (
              <TouchableOpacity
                key={sticker}
                style={styles.stickerBtn}
                onPress={() => {
                  onStickerSend?.(sticker);
                  setShowStickers(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.stickerText}>{sticker}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input bar */}
      {isRecording ? (
        // Recording state
        <View style={styles.recordingBar}>
          <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.recordingText}>Recording... {formatDuration(recordingDuration)}</Text>
          <Text style={styles.recordingHint}>Release to send</Text>
          <Pressable onPressOut={stopRecording} style={styles.recordingCancelBtn}>
            <Ionicons name="stop-circle" size={36} color="#EF4444" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Sticker toggle */}
          <TouchableOpacity
            onPress={() => setShowStickers((s) => !s)}
            style={styles.sideBtn}
            disabled={disabled}
          >
            <Text style={{ fontSize: 22 }}>{showStickers ? '⌨️' : '😊'}</Text>
          </TouchableOpacity>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={(t) => { setText(t); if (showStickers) setShowStickers(false); }}
              multiline
              maxLength={500}
              editable={!disabled}
              blurOnSubmit={false}
              underlineColorAndroid="transparent"
              textAlignVertical="center"
            />
          </View>

          {/* Send / Mic */}
          {hasText ? (
            <TouchableOpacity onPress={handleSend} disabled={disabled} activeOpacity={0.8}>
              <Animated.View style={[styles.sendBtnGlow, { transform: [{ scale: Animated.multiply(sendPulse, sendScale) }] }]}>
                <LinearGradient
                  colors={['#A855F7', '#EC4899']}
                  style={styles.sendBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Animated.View style={{ transform: [{ rotate: sendRotationDeg }] }}>
                    <Ionicons name="send" size={18} color="#fff" />
                  </Animated.View>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          ) : onVoiceNote ? (
            <Pressable
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={disabled}
              style={styles.sendBtnInactive}
            >
              <Ionicons name="mic-outline" size={20} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={[styles.sendBtnDimmed]}>
              <LinearGradient
                colors={['#A855F7', '#EC4899']}
                style={styles.sendBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </LinearGradient>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mentionList: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    backgroundColor: colors.bgElevated, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  mentionItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mentionText: { ...typography.body, color: colors.textPrimary, fontSize: 14 },

  // Sticker panel
  stickerPanel: {
    backgroundColor: colors.bgCard,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  packTabs: { marginBottom: spacing.sm },
  packTab: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  packTabActive: { backgroundColor: colors.primary + '33', borderWidth: 1, borderColor: colors.primary + '66' },
  packTabEmoji: { fontSize: 20 },
  stickerGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm, gap: 6,
  },
  stickerBtn: {
    width: '11%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated, borderRadius: 10,
  },
  stickerText: { fontSize: 22 },

  // Input row
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10, gap: spacing.sm,
  },
  sideBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  inputRow: {
    flex: 1, backgroundColor: colors.bgElevated,
    borderRadius: 22, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    minHeight: 44,
  },
  input: {
    ...typography.chat, color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 40,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnGlow: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
    borderRadius: 22,
  },
  sendBtnDimmed: {
    opacity: 0.4,
    borderRadius: 22,
  },
  sendBtnInactive: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },

  // Recording bar
  recordingBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    gap: 10,
  },
  recordingDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444',
  },
  recordingText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#EF4444' },
  recordingHint: { fontSize: 12, color: colors.textMuted },
  recordingCancelBtn: { padding: 4 },
});
