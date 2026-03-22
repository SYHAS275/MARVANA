import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Modal, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '../../store/useUserStore';
import { characters } from '../../data/characters';
import { Avatar } from '../../components/common/Avatar';
import { SARVAM_LANGUAGES } from '../../services/sarvam';
import { deleteAccount } from '../../services/supabase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function ProfileScreen() {
  const router = useRouter();
  const { name, email, streakCount, favoriteCharacters, avatarUrl, logout, updateAvatar, bio, setBio, preferredLanguage, setPreferredLanguage, isPremium, authSession, userId } = useUserStore() as any;
  const [uploading, setUploading] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [bioText, setBioText] = useState(bio || '');
  const activeLang = SARVAM_LANGUAGES.find((l) => l.code === preferredLanguage) || SARVAM_LANGUAGES[0];

  const favChars = characters.filter((c: any) => favoriteCharacters.includes(c.id));

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      await updateAvatar(asset.uri, asset.mimeType || 'image/jpeg');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload profile picture. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBio = () => {
    if (setBio) setBio(bioText.trim());
    setShowBioModal(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'Your account will be deleted immediately.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    if (authSession && userId) {
                      await deleteAccount(authSession.accessToken, userId);
                    }
                    await logout();
                    router.replace('/auth/login');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Could not delete account.');
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.leaderboardBtn} onPress={() => router.push('/leaderboard' as any)}>
          <Ionicons name="trophy-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + info card */}
        <LinearGradient
          colors={[colors.primaryDark + '44', 'transparent']}
          style={styles.profileCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper} disabled={uploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {name ? name[0].toUpperCase() : '?'}
                </Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View style={styles.cameraTag}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.profileName}>{name || 'Anonymous'}</Text>
          <Text style={styles.profileEmail}>{email}</Text>

          {/* Bio */}
          <TouchableOpacity onPress={() => { setBioText(bio || ''); setShowBioModal(true); }} style={styles.bioRow}>
            <Text style={styles.bioText} numberOfLines={2}>
              {bio || '+ Add a bio...'}
            </Text>
            <Ionicons name="pencil" size={13} color={colors.textMuted} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {streakCount > 0 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakLabel}>{streakCount} day streak</Text>
            </View>
          )}
        </LinearGradient>

        {/* Favorite characters */}
        {favChars.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Characters</Text>
            <View style={styles.favRow}>
              {favChars.map((char: any) => (
                <View key={char.id} style={styles.favChip}>
                  <Avatar color={char.avatarColor} emoji={char.avatarEmoji} image={char.avatarImage} size={28} />
                  <Text style={styles.favName}>{char.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Settings rows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handlePickAvatar} disabled={uploading}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="image-outline" size={20} color={colors.primary} /></View>
                <Text style={styles.rowText}>Change Profile Picture</Text>
              </View>
              {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => { setBioText(bio || ''); setShowBioModal(true); }}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="pencil-outline" size={20} color={colors.primary} /></View>
                <Text style={styles.rowText}>Edit Bio</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => router.push('/onboarding/characters' as never)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="people-outline" size={20} color={colors.primary} /></View>
                <Text style={styles.rowText}>Change Characters</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => setShowLangModal(true)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Text style={{ fontSize: 18, textAlign: 'center' }}>🗣️</Text></View>
                <View>
                  <Text style={styles.rowText}>Voice Language</Text>
                  <Text style={styles.rowSub}>{activeLang.script} ({activeLang.label})</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => router.push('/create-character' as any)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="add-circle-outline" size={20} color={colors.primary} /></View>
                <Text style={styles.rowText}>Create AI Persona</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => router.push('/leaderboard' as any)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="trophy-outline" size={20} color={colors.primary} /></View>
                <Text style={styles.rowText}>Leaderboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => router.push('/stories' as any)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="book-outline" size={20} color={colors.primary} /></View>
                <Text style={styles.rowText}>Stories</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => router.push('/premium' as any)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Text style={{ fontSize: 18, textAlign: 'center' }}>👑</Text></View>
                <View>
                  <Text style={styles.rowText}>{isPremium ? 'Premium Active' : 'Go Premium'}</Text>
                  {!isPremium && <Text style={styles.rowSub}>Unlock all features</Text>}
                </View>
              </View>
              {isPremium
                ? <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>Active</Text></View>
                : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              }
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => router.push('/terms' as any)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="document-text-outline" size={20} color={colors.textMuted} /></View>
                <Text style={styles.rowText}>Terms & Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="log-out-outline" size={20} color={colors.error} /></View>
                <Text style={[styles.rowText, { color: colors.error }]}>Logout</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="trash-outline" size={20} color={colors.error} /></View>
                <Text style={[styles.rowText, { color: colors.error }]}>Delete Account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLangModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.bioSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.bioSheetTitle}>🗣️ Voice Language</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
                AI messages will be spoken in your chosen language
              </Text>
              <FlatList
                data={SARVAM_LANGUAGES}
                keyExtractor={(l) => l.code}
                scrollEnabled={false}
                renderItem={({ item: lang }) => {
                  const isActive = lang.code === preferredLanguage;
                  return (
                    <TouchableOpacity
                      style={[styles.langRow, isActive && styles.langRowActive]}
                      onPress={() => { setPreferredLanguage(lang.code); setShowLangModal(false); }}
                    >
                      <View style={styles.langLeft}>
                        <Text style={styles.langScript}>{lang.script}</Text>
                        <Text style={styles.langLabel}>{lang.label}</Text>
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Bio edit modal */}
      <Modal visible={showBioModal} transparent animationType="slide" onRequestClose={() => setShowBioModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBioModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.bioSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.bioSheetTitle}>Edit Bio</Text>
              <TextInput
                style={styles.bioInput}
                value={bioText}
                onChangeText={setBioText}
                placeholder="Tell people about yourself..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={150}
                autoFocus
              />
              <Text style={styles.bioCharCount}>{bioText.length}/150</Text>
              <TouchableOpacity style={styles.bioSaveBtn} onPress={handleSaveBio}>
                <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Text style={styles.bioSaveBtnText}>Save Bio</Text>
              </TouchableOpacity>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  leaderboardBtn: { padding: 4 },
  profileCard: {
    margin: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  avatarWrapper: { marginBottom: spacing.sm, position: 'relative' },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 2.5, borderColor: colors.primary },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary + '33', borderWidth: 2.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 44, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraTag: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: colors.primary },
  profileName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  profileEmail: { ...typography.caption, color: colors.textMuted },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 260,
  },
  bioText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', flex: 1 },
  streakRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FF922B18', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginTop: spacing.xs,
  },
  streakEmoji: { fontSize: 16 },
  streakLabel: { fontSize: 14, fontWeight: '700', color: '#FF922B' },
  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.md,
  },
  favRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  favChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.bgCard, borderRadius: 20,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  favName: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  card: { backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 14, minHeight: 54 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  rowDivider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 24 + 12 },
  // Bio modal
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  bioSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xxl, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  bioSheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },
  bioInput: {
    backgroundColor: colors.bgElevated, borderRadius: 14, padding: spacing.md,
    color: colors.textPrimary, fontSize: 15, lineHeight: 22,
    minHeight: 90, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.border,
  },
  bioCharCount: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 6 },
  bioSaveBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', overflow: 'hidden', marginTop: 16 },
  bioSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  rowSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  premiumBadge: { backgroundColor: '#A855F722', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#A855F755' },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', color: '#A855F7' },
  langRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderRadius: 12, marginBottom: 4,
  },
  langRowActive: { backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '44' },
  langLeft: { gap: 2 },
  langScript: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  langLabel: { fontSize: 12, color: colors.textMuted },
});
