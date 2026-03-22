import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';

const SECTIONS = [
  {
    title: '1. What is Daze?',
    body: 'Daze is an AI-powered social chat app featuring fictional AI characters. All AI personas are fictional and not real people. Conversations are for entertainment purposes.',
  },
  {
    title: '2. Age Requirement',
    body: 'You must be 13 or older to use Daze. By using the app you confirm you meet this requirement. Some content may be intended for users 18+.',
  },
  {
    title: '3. Data We Collect',
    body: 'We collect your email, name, and chat activity to personalize your experience. We do not sell your data to third parties. Messages may be stored to improve AI responses.',
  },
  {
    title: '4. AI Characters',
    body: 'AI characters are powered by large language models. Their responses are generated automatically and may occasionally be inaccurate or inappropriate. Please report any harmful content.',
  },
  {
    title: '5. User Content',
    body: 'You are responsible for content you post. Do not share illegal, harmful, or harassing content. We reserve the right to remove content and ban users who violate these rules.',
  },
  {
    title: '6. Premium Subscriptions',
    body: 'Premium plans are billed through Razorpay. Subscriptions auto-renew unless cancelled. Refunds are handled per Razorpay\'s refund policy. Cancel any time in your app store settings.',
  },
  {
    title: '7. Coins & Virtual Currency',
    body: 'Coins are virtual currency with no real-world monetary value. They cannot be exchanged for cash. We reserve the right to modify coin values at any time.',
  },
  {
    title: '8. Privacy & Security',
    body: 'We use industry-standard encryption to protect your data. However, no system is 100% secure. Do not share sensitive personal information (Aadhaar, bank details) in chats.',
  },
  {
    title: '9. Changes to Terms',
    body: 'We may update these terms at any time. Continued use of the app after changes means you accept the new terms. We will notify users of significant changes.',
  },
  {
    title: '10. Contact Us',
    body: 'Questions? Email us at support@daze.app — we respond within 48 hours.',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Privacy</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>📄</Text>
          <Text style={styles.heroTitle}>Terms of Service</Text>
          <Text style={styles.heroSub}>Last updated: March 2025</Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://daze.app/privacy')}>
            <Text style={styles.link}>Privacy Policy ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://daze.app/terms')}>
            <Text style={styles.link}>Full Terms ↗</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  heroSub: { fontSize: 13, color: colors.textMuted },
  section: { marginBottom: 20, backgroundColor: '#111', borderRadius: 14, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  sectionBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  linksRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 8, marginBottom: 16 },
  link: { fontSize: 14, fontWeight: '700', color: '#A855F7' },
});
