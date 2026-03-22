import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/useUserStore';
import { colors } from '../theme/colors';

const PLANS = [
  { id: 'weekly',  label: 'Weekly',  price: '₹29',  period: '/week',  popular: false },
  { id: 'monthly', label: 'Monthly', price: '₹99',  period: '/month', popular: true  },
  { id: 'yearly',  label: 'Yearly',  price: '₹699', period: '/year',  popular: false },
];

const PERKS = [
  { icon: '🤖', title: 'Unlimited AI chats',    sub: 'No daily limits, ever' },
  { icon: '👑', title: 'Exclusive characters',  sub: '4 premium-only AI personas' },
  { icon: '🎨', title: 'Custom wallpapers',     sub: 'Per-chat themes & backgrounds' },
  { icon: '🧠', title: 'Character memory',      sub: 'AI remembers everything' },
  { icon: '🔥', title: 'Streak shield',         sub: 'Protect your streak for 3 days' },
  { icon: '🪙', title: '500 coins/month',       sub: 'Credited on renewal' },
  { icon: '⚡', title: 'Priority responses',    sub: 'Faster AI replies' },
  { icon: '🚫', title: 'Ad-free forever',       sub: 'Clean, no interruptions' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const isPremium = useUserStore((s) => s.isPremium);
  const setPremium = useUserStore((s) => s.setPremium);
  const [selected, setSelected] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    // Simulate payment flow — replace with RevenueCat / Stripe
    await new Promise((r) => setTimeout(r, 1200));
    setPremium(true);
    setLoading(false);
    Alert.alert('Welcome to Premium! 👑', 'Your subscription is now active. Enjoy all the perks!', [
      { text: 'Let\'s go!', onPress: () => router.back() },
    ]);
  };

  if (isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.alreadyPremium}>
          <Text style={{ fontSize: 64 }}>👑</Text>
          <Text style={styles.premiumTitle}>You're Premium!</Text>
          <Text style={styles.premiumSub}>All perks are unlocked. You're the main character.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <LinearGradient colors={['#A855F7', '#EC4899']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.heroEmoji}>👑</Text>
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSub}>Unlock the full Daze experience</Text>
        </LinearGradient>

        {/* Perks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you get</Text>
          {PERKS.map((p) => (
            <View key={p.title} style={styles.perkRow}>
              <Text style={styles.perkIcon}>{p.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkSub}>{p.sub}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#A855F7" />
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a plan</Text>
          <View style={styles.plans}>
            {PLANS.map((plan) => (
              <TouchableOpacity key={plan.id} style={[styles.planCard, selected === plan.id && styles.planCardActive]}
                onPress={() => setSelected(plan.id)}>
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}
                <Text style={styles.planLabel}>{plan.label}</Text>
                <Text style={[styles.planPrice, selected === plan.id && { color: '#A855F7' }]}>{plan.price}</Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
                {selected === plan.id && <Ionicons name="checkmark-circle" size={20} color="#A855F7" style={styles.planCheck} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subscribe button */}
        <TouchableOpacity style={styles.subBtn} onPress={handleSubscribe} disabled={loading}>
          <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <Text style={styles.subBtnText}>{loading ? 'Processing...' : `Subscribe ${PLANS.find((p) => p.id === selected)?.price}`}</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>Cancel anytime. Secure payment via Razorpay. By subscribing you agree to our Terms.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backBtn: { padding: 16 },
  scroll: { paddingBottom: 48, gap: 0 },
  hero: { padding: 36, alignItems: 'center', gap: 8 },
  heroEmoji: { fontSize: 52 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  section: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#111', borderRadius: 14, padding: 14 },
  perkIcon: { fontSize: 24 },
  perkTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  perkSub: { fontSize: 12, color: colors.textMuted },
  plans: { flexDirection: 'row', gap: 10 },
  planCard: { flex: 1, backgroundColor: '#111', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#222', gap: 2, overflow: 'hidden' },
  planCardActive: { borderColor: '#A855F7', backgroundColor: '#A855F711' },
  popularBadge: { position: 'absolute', top: 0, left: 0, right: 0, height: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  popularText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  planLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 14 },
  planPrice: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  planPeriod: { fontSize: 11, color: colors.textMuted },
  planCheck: { marginTop: 4 },
  subBtn: { marginHorizontal: 20, borderRadius: 18, paddingVertical: 18, alignItems: 'center', overflow: 'hidden' },
  subBtnText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  legal: { fontSize: 11, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24, marginTop: 12 },
  alreadyPremium: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  premiumTitle: { fontSize: 28, fontWeight: '900', color: colors.textPrimary },
  premiumSub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});
