import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../store/useUserStore';
import { useChatStore } from '../store/useChatStore';
import { colors } from '../theme/colors';
import { setupNotificationHandler, registerForPushNotifications } from '../services/notifications';
import { checkIncomingCall, endCall, CallRecord, UserProfileRow, searchUsers } from '../services/supabase';
import { IncomingCall } from '../components/common/IncomingCall';

// Setup notification handler before any component renders
setupNotificationHandler();

const AGE_VERIFIED_KEY = 'daze:age_verified';
const REVIEW_PROMPT_KEY = 'daze:review_prompted';

async function checkAndPromptReview(messageCount: number) {
  // Prompt for review after 10 messages
  if (messageCount < 10) return;
  try {
    const prompted = await AsyncStorage.getItem(REVIEW_PROMPT_KEY);
    if (prompted) return;
    await AsyncStorage.setItem(REVIEW_PROMPT_KEY, 'true');
    Alert.alert(
      'Enjoying Daze? ⭐',
      'Tap a star to rate us on the App Store — it helps us grow!',
      [
        {
          text: '⭐ Rate Now',
          onPress: () => {
            // Replace with actual App Store / Play Store ID when published
            Linking.openURL('https://apps.apple.com/app/id0000000000').catch(() => {});
          },
        },
        { text: 'Maybe Later', style: 'cancel' },
      ],
    );
  } catch {}
}

export { checkAndPromptReview };

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [ageVerified, setAgeVerified] = useState<boolean | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const [callerName, setCallerName] = useState('');
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const authSession = useUserStore((s) => s.authSession);
  const myId = useUserStore((s) => s.userId);

  useEffect(() => {
    async function hydrate() {
      const [verified] = await Promise.all([
        AsyncStorage.getItem(AGE_VERIFIED_KEY),
        useUserStore.getState().hydrate(),
        useChatStore.getState().hydrate(),
      ]);
      setAgeVerified(!!verified);
      setReady(true);
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!ageVerified) {
      router.replace('/age-gate');
      return;
    }
    // Register for push in background (non-blocking)
    registerForPushNotifications().then((token) => {
      if (token) console.log('Push token registered:', token);
    });
  }, [ready, ageVerified]);

  // Poll for incoming calls every 4s when logged in
  useEffect(() => {
    if (!authSession || !myId) return;
    callPollRef.current = setInterval(async () => {
      const call = await checkIncomingCall(authSession.accessToken, myId);
      if (call && call.id !== incomingCall?.id) {
        // Resolve caller name
        try {
          const results = await searchUsers(authSession.accessToken, call.from_id);
          const caller = results.find((u: UserProfileRow) => u.id === call.from_id);
          setCallerName(caller?.name || caller?.email || 'Someone');
        } catch {
          setCallerName('Someone');
        }
        setIncomingCall(call);
      } else if (!call && incomingCall) {
        setIncomingCall(null);
      }
    }, 4000);
    return () => clearInterval(callPollRef.current!);
  }, [authSession, myId, incomingCall]);

  const handleAcceptCall = (call: CallRecord) => {
    setIncomingCall(null);
    router.push(
      `/call/${call.from_id}?name=${encodeURIComponent(callerName)}&type=${call.type}&callId=${call.id}&incoming=true`
    );
  };

  const handleDeclineCall = async (call: CallRecord) => {
    setIncomingCall(null);
    if (authSession) {
      await endCall(authSession.accessToken, call.id, 'declined').catch(() => {});
    }
  };

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <IncomingCall
        call={incomingCall}
        callerName={callerName}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
