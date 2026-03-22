import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const EMOJI_OPTIONS = ['🤖', '👾', '🧠', '🦊', '🐉', '🌟', '💎', '🔮', '🎭', '🦋', '🌙', '⚡'];
const COLOR_OPTIONS = [
  '#A855F7', '#EC4899', '#3B82F6', '#22C55E',
  '#F97316', '#EAB308', '#06B6D4', '#F43F5E',
  '#8B5CF6', '#10B981', '#F59E0B', '#6366F1',
];
const ARCHETYPES = [
  'Best Friend', 'Mentor', 'Rival', 'Comic Relief',
  'Philosopher', 'Hype Person', 'Brutally Honest', 'Mysterious',
];

const CUSTOM_CHARS_KEY = 'daze:custom_characters';

export interface CustomCharacter {
  id: string;
  name: string;
  archetype: string;
  personality: string;
  speakingStyle: string;
  avatarEmoji: string;
  avatarColor: string;
  city: string;
  tagline: string;
  isCustom: true;
}

export async function loadCustomCharacters(): Promise<CustomCharacter[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CHARS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomCharacter(char: CustomCharacter): Promise<void> {
  const existing = await loadCustomCharacters();
  const filtered = existing.filter((c) => c.id !== char.id);
  await AsyncStorage.setItem(CUSTOM_CHARS_KEY, JSON.stringify([...filtered, char]));
}

export default function CreateCharacterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [tagline, setTagline] = useState('');
  const [personality, setPersonality] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🤖');
  const [selectedColor, setSelectedColor] = useState('#A855F7');
  const [selectedArchetype, setSelectedArchetype] = useState('Best Friend');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give your AI character a name!');
      return;
    }
    if (!personality.trim()) {
      Alert.alert('Missing personality', 'Describe your character\'s personality!');
      return;
    }

    setSaving(true);
    const char: CustomCharacter = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      archetype: selectedArchetype,
      personality: personality.trim(),
      speakingStyle: speakingStyle.trim() || 'Casual and friendly',
      avatarEmoji: selectedEmoji,
      avatarColor: selectedColor,
      city: city.trim() || 'The Internet',
      tagline: tagline.trim() || `I'm ${name.trim()}, your custom AI!`,
      isCustom: true,
    };

    try {
      await saveCustomCharacter(char);
      Alert.alert('Created! 🎉', `${name} is ready to chat in your Discover tab!`, [
        { text: 'Go to Discover', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save character. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Create AI Persona</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar preview */}
        <View style={styles.avatarPreviewSection}>
          <TouchableOpacity
            style={[styles.avatarPreview, { backgroundColor: selectedColor + '33', borderColor: selectedColor }]}
            onPress={() => setShowEmojiPicker(true)}
          >
            <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change emoji</Text>
          {/* Color row */}
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Nova, Sage, Blaze..."
              placeholderTextColor={colors.textMuted}
              maxLength={30}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Archetype</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {ARCHETYPES.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.chip, selectedArchetype === a && styles.chipActive]}
                  onPress={() => setSelectedArchetype(a)}
                >
                  <Text style={[styles.chipText, selectedArchetype === a && styles.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Personality *</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={personality}
              onChangeText={setPersonality}
              placeholder="Describe how they think and act... e.g. Chill and wise, loves philosophy and deep talks, never judges"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{personality.length}/200</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Speaking Style</Text>
            <TextInput
              style={styles.input}
              value={speakingStyle}
              onChangeText={setSpeakingStyle}
              placeholder="e.g. Gen Z slang, poetic, direct, formal..."
              placeholderTextColor={colors.textMuted}
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City / Origin</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Tokyo, The Metaverse, Mars..."
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tagline</Text>
            <TextInput
              style={styles.input}
              value={tagline}
              onChangeText={setTagline}
              placeholder="Their signature quote..."
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <Text style={styles.saveBtnText}>{saving ? 'Creating...' : '✨ Create Character'}</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Emoji picker modal */}
      <Modal visible={showEmojiPicker} transparent animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEmojiPicker(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.emojiSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.emojiSheetTitle}>Pick an Emoji</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiOption, selectedEmoji === e && styles.emojiOptionActive]}
                    onPress={() => { setSelectedEmoji(e); setShowEmojiPicker(false); }}
                  >
                    <Text style={styles.emojiOptionText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.md,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  avatarPreviewSection: { alignItems: 'center', gap: 10, marginBottom: spacing.xxl },
  avatarPreview: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
  },
  avatarEmoji: { fontSize: 44 },
  avatarHint: { fontSize: 12, color: colors.textMuted },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 6 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  form: { gap: spacing.lg },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12, padding: spacing.md,
    color: colors.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  chipsRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  chipActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  saveBtn: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', overflow: 'hidden',
    marginTop: spacing.xxl,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  // Emoji modal
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  emojiSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xxl, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  emojiSheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  emojiOption: {
    width: 60, height: 60, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border,
  },
  emojiOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  emojiOptionText: { fontSize: 32 },
});
