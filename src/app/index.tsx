import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/useUserStore';

export default function Index() {
  const router = useRouter();
  const loggedIn = useUserStore((s) => s.loggedIn);
  const onboarded = useUserStore((s) => s.onboarded);

  useEffect(() => {
    if (!loggedIn) {
      router.replace('/auth/login');
    } else if (onboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding/name');
    }
  }, [loggedIn, onboarded]);

  return null;
}
