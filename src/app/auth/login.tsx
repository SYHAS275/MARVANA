import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Linking, Image } from 'react-native';

const DAZE_LOGO = require('../../../assets/daze-logo.png');
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../store/useUserStore';
import { GradientButton } from '../../components/common/GradientButton';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type AuthMode = 'login' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const login = useUserStore((s) => s.login);
  const signup = useUserStore((s) => s.signup);
  const resendVerificationEmail = useUserStore((s) => s.resendVerificationEmail);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  const cleanedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = cleanedEmail.includes('@') && password.length >= 6 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    setPendingVerification(false);

    const result = mode === 'login'
      ? await login(cleanedEmail, password)
      : await signup(cleanedEmail, password);

    setLoading(false);

    if (!result.ok && !result.pendingVerification) {
      setError(result.error || 'Authentication failed');
      return;
    }

    if (result.pendingVerification) {
      setError(result.error || 'Please verify your email, then login.');
      setPendingVerification(true);
      setMode('login');
      return;
    }

    if (result.needsOnboarding) {
      router.replace('/onboarding/name');
      return;
    }

    router.replace('/(tabs)');
  };

  const handleResend = async () => {
    if (!cleanedEmail.includes('@') || loading) return;
    setLoading(true);
    const result = await resendVerificationEmail(cleanedEmail);
    setLoading(false);
    setError(
      result.ok
        ? `Verification email resent to ${cleanedEmail}. Check spam/promotions as well.`
        : result.error || 'Could not resend verification email.'
    );
  };

  const openInboxApp = async (provider: 'gmail' | 'outlook' | 'default') => {
    try {
      if (provider === 'gmail') {
        const gmailApp = 'googlegmail://';
        const gmailWeb = 'https://mail.google.com/mail/u/0/#inbox';
        const target = await Linking.canOpenURL(gmailApp) ? gmailApp : gmailWeb;
        await Linking.openURL(target);
        return;
      }

      if (provider === 'outlook') {
        const outlookApp = 'ms-outlook://';
        const outlookWeb = 'https://outlook.office.com/mail/';
        const target = await Linking.canOpenURL(outlookApp) ? outlookApp : outlookWeb;
        await Linking.openURL(target);
        return;
      }

      await Linking.openURL('mailto:');
    } catch {
      setError('Could not open mail app. Please open your inbox manually.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#A855F722', 'transparent']}
        style={styles.bgGlow}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.content}>
          <Image source={DAZE_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{mode === 'login' ? 'Login' : 'Create account'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Login with your email to enter daze' : 'Sign up free with email and password'}
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 chars)"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {pendingVerification && (
            <Text style={styles.spamHint}>
              Didn&apos;t get it? Check Spam/Promotions and search for "Supabase" or "daze".
            </Text>
          )}

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => {
              setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
              setError('');
              setPendingVerification(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>

          {pendingVerification && mode === 'login' && (
            <>
              <TouchableOpacity style={styles.resendRow} onPress={() => void handleResend()} activeOpacity={0.7}>
                <Text style={styles.resendText}>Resend verification email</Text>
              </TouchableOpacity>
              <View style={styles.inboxActions}>
                <TouchableOpacity style={styles.inboxBtn} onPress={() => void openInboxApp('gmail')} activeOpacity={0.8}>
                  <Text style={styles.inboxBtnText}>Open Gmail</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inboxBtn} onPress={() => void openInboxApp('outlook')} activeOpacity={0.8}>
                  <Text style={styles.inboxBtnText}>Open Outlook</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inboxBtn} onPress={() => void openInboxApp('default')} activeOpacity={0.8}>
                  <Text style={styles.inboxBtnText}>Open Mail App</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <GradientButton
            title={mode === 'login' ? 'Login' : 'Create Account'}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
          {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
          <Text style={styles.hint}>Free Supabase auth is enabled</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
  },
  content: {
    marginTop: 60,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 34,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  error: {
    ...typography.small,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  spamHint: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 16,
  },
  switchRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  resendRow: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  resendText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  inboxActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  inboxBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  inboxBtnText: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loader: {
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
  },
});
