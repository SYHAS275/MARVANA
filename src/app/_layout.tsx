import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../store/useUserStore';
import { useChatStore } from '../store/useChatStore';
import { colors } from '../theme/colors';
import { setupNotificationHandler, registerForPushNotifications } from '../services/notifications';
import { checkIncomingCall, endCall, CallRecord, UserProfileRow, searchUsers } from '../services/supabase';
import { IncomingCall } from '../components/common/IncomingCall';
import MarvanaLoader from '../components/common/MarvanaLoader';

// Setup notification handler before any component renders
setupNotificationHandler();

const AGE_VERIFIED_KEY = 'marvana:age_verified';
const REVIEW_PROMPT_KEY = 'marvana:review_prompted';

async function checkAndPromptReview(messageCount: number) {
  // Prompt for review after 10 messages
  if (messageCount < 10) return;
  try {
    const prompted = await AsyncStorage.getItem(REVIEW_PROMPT_KEY);
    if (prompted) return;
    await AsyncStorage.setItem(REVIEW_PROMPT_KEY, 'true');
    Alert.alert(
      'Enjoying Marvana? ⭐',
      'Tap a star to rate us on the App Store — it helps us grow!',
      [
        {
          text: '⭐ Rate Now',
          onPress: () => {
            // TODO: Replace APP_STORE_ID and PLAY_STORE_ID with real IDs before publishing
            const url = Platform.OS === 'ios'
              ? 'https://apps.apple.com/app/idAPP_STORE_ID'
              : 'https://play.google.com/store/apps/details?id=com.marvana.app';
            Linking.openURL(url).catch(() => {});
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
      <>
        <MarvanaLoader />
        <StatusBar style="light" />
      </>
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

const styles = StyleSheet.create({});
