import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/useUserStore';
import { fetchLeaderboard, LeaderboardEntry, getReferralCode } from '../services/supabase';
import { colors } from '../theme/colors';

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#FFD600', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const authSession = useUserStore((s) => s.authSession);
  const myId = useUserStore((s) => s.userId);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'global' | 'referral'>('global');
  const referralCode = getReferralCode(myId);

  useEffect(() => {
    if (authSession) {
      fetchLeaderboard(authSession.accessToken)
        .then(setEntries).catch(() => {}).finally(() => setLoading(false));
    }
  }, [authSession]);

  const myRank = entries.findIndex((e) => e.id === myId) + 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabs}>
        {(['global', 'referral'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'global' ? '🌍 Global' : '🎁 Referrals'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'global' ? (
        loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /> : (
          <>
            {myRank > 0 && (
              <View style={styles.myRankCard}>
                <LinearGradient colors={['#A855F722', '#EC489922']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Text style={styles.myRankLabel}>Your rank</Text>
                <Text style={styles.myRankNum}>#{myRank}</Text>
              </View>
            )}
            <FlatList
              data={entries}
              keyExtractor={(e) => e.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item, index }) => {
                const isMe = item.id === myId;
                const rank = index + 1;
                const letter = (item.name || 'U')[0].toUpperCase();
                const hue = (item.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                return (
                  <View style={[styles.entry, isMe && styles.entryMe]}>
                    <Text style={styles.rankText}>{rank <= 3 ? RANK_EMOJIS[rank - 1] : `#${rank}`}</Text>
                    <View style={[styles.avatar, { backgroundColor: `hsl(${hue},60%,35%)` }]}>
                      <Text style={styles.avatarLetter}>{letter}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryName}>{isMe ? `${item.name} (You)` : item.name || 'User'}</Text>
                      <Text style={styles.entrySub}>🔥 {item.streak_count || 0}d streak</Text>
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreNum, rank <= 3 && { color: RANK_COLORS[rank - 1] }]}>{item.message_count || 0}</Text>
                      <Text style={styles.scoreLabel}>msgs</Text>
                    </View>
                  </View>
                );
              }}
            />
          </>
        )
      ) : (
        <View style={styles.referralTab}>
          <Text style={{ fontSize: 52 }}>🎁</Text>
          <Text style={styles.refTitle}>Invite & Earn</Text>
          <Text style={styles.refSub}>Get 200 coins for every friend who joins with your code</Text>
          <View style={styles.codeCard}>
            <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.codeLabel}>Your Code</Text>
            <Text style={styles.code}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={() => Share.share({ message: `Join me on Daze! Use code: ${referralCode}` })}>
            <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Ionicons name="share-social" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Share your code</Text>
          </TouchableOpacity>
          {[['1','Share your code'],['2','Friend signs up'],['3','Both get 200 🪙']].map(([n, t]) => (
            <View key={n} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
              <Text style={styles.stepText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#111', borderRadius: 14, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#222' },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary, fontWeight: '800' },
  myRankCard: { marginHorizontal: 16, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', marginBottom: 4 },
  myRankLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  myRankNum: { fontSize: 24, fontWeight: '900', color: colors.primary },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111', borderRadius: 14, padding: 12 },
  entryMe: { borderWidth: 1.5, borderColor: colors.primary + '55', backgroundColor: colors.primary + '11' },
  rankText: { fontSize: 18, width: 36, textAlign: 'center', fontWeight: '800', color: colors.textMuted },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: '#fff' },
  entryName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  entrySub: { fontSize: 12, color: colors.textMuted },
  scoreBox: { alignItems: 'center' },
  scoreNum: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  scoreLabel: { fontSize: 10, color: colors.textMuted },
  referralTab: { flex: 1, alignItems: 'center', paddingTop: 24, paddingHorizontal: 24, gap: 14 },
  refTitle: { fontSize: 26, fontWeight: '900', color: colors.textPrimary },
  refSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  codeCard: { width: '100%', borderRadius: 20, padding: 24, alignItems: 'center', gap: 4, overflow: 'hidden' },
  codeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase' },
  code: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 6 },
  shareBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, overflow: 'hidden' },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  step: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111', borderRadius: 14, padding: 14 },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  stepText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
});
