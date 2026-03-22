import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const AGE_VERIFIED_KEY = 'daze:age_verified';

export async function hasVerifiedAge(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(AGE_VERIFIED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export default function AgeGateScreen() {
  const router = useRouter();
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  const handleContinue = async () => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);

    if (!y || !m || !d || year.length !== 4 || m < 1 || m > 12 || d < 1 || d > 31) {
      Alert.alert('Invalid Date', 'Please enter a valid date of birth.');
      return;
    }

    const dob = new Date(y, m - 1, d);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear()
      - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

    if (age < 13) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 13 years old to use Daze.',
        [{ text: 'OK' }]
      );
      return;
    }

    await AsyncStorage.setItem(AGE_VERIFIED_KEY, 'true');
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🎂</Text>
          <Text style={styles.title}>What's your birthday?</Text>
          <Text style={styles.sub}>We need this to make sure you meet our age requirement (13+)</Text>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>DD</Text>
              <TextInput
                style={styles.dateInput}
                value={day}
                onChangeText={(t) => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
                placeholderTextColor={colors.textMuted}
                textAlign="center"
              />
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>MM</Text>
              <TextInput
                style={styles.dateInput}
                value={month}
                onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor={colors.textMuted}
                textAlign="center"
              />
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>YYYY</Text>
              <TextInput
                style={[styles.dateInput, styles.yearInput]}
                value={year}
                onChangeText={(t) => setYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor={colors.textMuted}
                textAlign="center"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, (!day || !month || !year) && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!day || !month || !year}
          >
            <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  emoji: { fontSize: 64 },
  title: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 8 },
  dateField: { alignItems: 'center', gap: 4 },
  dateLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  dateInput: {
    width: 64, height: 56, backgroundColor: '#111', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#333',
    color: colors.textPrimary, fontSize: 22, fontWeight: '700',
  },
  yearInput: { width: 88 },
  dateSep: { fontSize: 28, color: colors.textMuted, fontWeight: '700', paddingBottom: 8 },
  btn: { width: '100%', borderRadius: 18, paddingVertical: 18, alignItems: 'center', overflow: 'hidden' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  legal: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
