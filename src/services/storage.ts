import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER: 'adda:user',
  AUTH_SESSION: 'adda:auth_session',
  CHATS: 'adda:chats',
  MESSAGES: 'adda:messages',
  ONBOARDING: 'adda:onboarding',
  STREAK: 'adda:streak',
} as const;

export async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save error:', e);
  }
}

export async function loadData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Storage load error:', e);
    return null;
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    console.warn('Storage clear error:', e);
  }
}

export { KEYS };
