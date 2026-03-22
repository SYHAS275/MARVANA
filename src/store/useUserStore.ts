import { create } from 'zustand';
import { UserProfile } from '../types';
import { saveData, loadData, KEYS } from '../services/storage';
import { COIN_REWARDS, getStreakBonus } from '../utils/coins';
import {
  SupabaseSession,
  fetchProfile,
  getCurrentUser,
  isSupabaseConfigured,
  refreshSupabaseSession,
  resendSignupVerificationEmail,
  signInWithEmail,
  signUpWithEmail,
  supabaseSignOut,
  upsertProfile,
  uploadAvatar,
  blockUser as supabaseBlockUser,
  unblockUser as supabaseUnblockUser,
  fetchBlockedIds,
} from '../services/supabase';

interface AuthResult {
  ok: boolean;
  error?: string;
  needsOnboarding?: boolean;
  pendingVerification?: boolean;
}

interface UserState extends UserProfile {
  authSession: SupabaseSession | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string) => Promise<AuthResult>;
  resendVerificationEmail: (email: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  setName: (name: string) => void;
  setFavoriteCharacters: (ids: string[]) => void;
  completeOnboarding: () => void;
  hydrate: () => Promise<void>;
  recordChatActivity: () => void;
  updateAvatar: (imageUri: string, mimeType?: string) => Promise<void>;
  setBio: (bio: string) => void;
  setPreferredLanguage: (lang: string) => void;
  coins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  pendingStreakMilestone: number | null;
  clearStreakMilestone: () => void;
  blockedUserIds: string[];
  blockUser: (targetId: string) => Promise<void>;
  unblockUser: (targetId: string) => Promise<void>;
  isBlocked: (targetId: string) => boolean;
  isPremium: boolean;
  setPremium: (val: boolean) => void;
}

const SESSION_REFRESH_BUFFER_SECONDS = 60;

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeName(name: string): string {
  return name.trim();
}

function normalizeAuthError(error: unknown): string {
  const fallback = 'Something went wrong. Please try again.';
  if (!(error instanceof Error)) return fallback;

  const raw = error.message || fallback;
  if (raw.toLowerCase().includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (raw.toLowerCase().includes('email not confirmed')) {
    return 'Please verify your email first, then login.';
  }
  return raw;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickPersistedUser(state: UserState): UserProfile {
  return {
    userId: state.userId,
    email: state.email,
    name: state.name,
    favoriteCharacters: state.favoriteCharacters,
    onboarded: state.onboarded,
    loggedIn: state.loggedIn,
    streakCount: state.streakCount,
    lastChatDate: state.lastChatDate,
    avatarUrl: state.avatarUrl,
    bio: state.bio,
    preferredLanguage: state.preferredLanguage,
    coins: state.coins,
    isPremium: state.isPremium,
  };
}

async function persistUser(state: UserState): Promise<void> {
  await saveData(KEYS.USER, pickPersistedUser(state));
}

async function persistSession(session: SupabaseSession | null): Promise<void> {
  await saveData(KEYS.AUTH_SESSION, session);
}

export const useUserStore = create<UserState>((set, get) => {
  const syncProfileIfPossible = async () => {
    const state = get();
    if (!state.loggedIn || !state.authSession || !state.userId || !state.email) return;

    try {
      await upsertProfile(state.authSession.accessToken, {
        id: state.userId,
        email: state.email,
        name: state.name || undefined,
        favorite_characters: state.favoriteCharacters,
        onboarded: state.onboarded,
      });
    } catch (error) {
      console.warn('Profile sync failed:', error);
    }
  };

  const completeLoginFromSession = async (session: SupabaseSession): Promise<AuthResult> => {
    try {
      const user = session.user.id ? session.user : await getCurrentUser(session.accessToken);
      const userId = user.id;
      const email = user.email ? sanitizeEmail(user.email) : '';

      if (!userId || !email) {
        return { ok: false, error: 'Supabase user info incomplete. Check auth settings.' };
      }

      // Load local data first — acts as fallback if Supabase sync failed
      const localUser = await loadData<Partial<UserProfile>>(KEYS.USER);
      const localIsThisUser = localUser?.userId === userId;

      let name = localIsThisUser ? (localUser?.name || '') : '';
      let favoriteCharacters: string[] = localIsThisUser ? (localUser?.favoriteCharacters || []) : [];
      let onboarded = localIsThisUser ? Boolean(localUser?.onboarded) : false;
      let avatarUrl: string | undefined = localIsThisUser ? (localUser?.avatarUrl || undefined) : undefined;

      try {
        const remoteProfile = await fetchProfile(session.accessToken, userId);
        if (remoteProfile) {
          // Prefer remote values, but keep local onboarded=true if remote hasn't synced yet
          name = remoteProfile.name || name;
          favoriteCharacters = remoteProfile.favorite_characters || favoriteCharacters;
          avatarUrl = remoteProfile.avatar_url || avatarUrl;
          const remoteOnboarded = Boolean(remoteProfile.onboarded);
          // If local says onboarded but remote doesn't, repair the remote record
          if (onboarded && !remoteOnboarded) {
            upsertProfile(session.accessToken, {
              id: userId, email,
              name,
              favorite_characters: favoriteCharacters,
              onboarded: true,
            }).catch(() => {});
          } else {
            onboarded = remoteOnboarded;
          }
        } else {
          await upsertProfile(session.accessToken, {
            id: userId,
            email,
            onboarded,
            name: name || undefined,
            favorite_characters: favoriteCharacters,
          });
        }
      } catch (error) {
        console.warn('Profile fetch/create failed (DB not set up?):', error);
      }

      // Load blocked user IDs in background
      let blockedUserIds: string[] = [];
      try {
        blockedUserIds = await fetchBlockedIds(session.accessToken, userId);
      } catch {}

      set({
        authSession: session,
        userId,
        email,
        name,
        favoriteCharacters,
        onboarded,
        loggedIn: true,
        avatarUrl,
        blockedUserIds,
      });

      await Promise.all([persistSession(session), persistUser(get())]);

      return { ok: true, needsOnboarding: !onboarded };
    } catch (error) {
      return { ok: false, error: normalizeAuthError(error) };
    }
  };

  return {
    userId: '',
    email: '',
    name: '',
    favoriteCharacters: [],
    onboarded: false,
    loggedIn: false,
    streakCount: 0,
    lastChatDate: null,
    authSession: null,
    avatarUrl: undefined,
    bio: undefined,
    preferredLanguage: 'en-IN',
    coins: 0,
    isPremium: false,
    pendingStreakMilestone: null,
    blockedUserIds: [],

    recordChatActivity: () => {
      const today = todayDateString();
      const { lastChatDate, streakCount, coins } = get();
      if (lastChatDate === today) return; // already recorded today

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const newStreak = lastChatDate === yesterdayStr ? streakCount + 1 : 1;
      const MILESTONES = [3, 7, 14, 30, 60, 100];
      const hitMilestone = MILESTONES.includes(newStreak) ? newStreak : null;
      const bonusCoins = getStreakBonus(newStreak);
      const dailyCoins = COIN_REWARDS.DAILY_LOGIN;

      set({
        streakCount: newStreak,
        lastChatDate: today,
        coins: coins + dailyCoins + bonusCoins,
        pendingStreakMilestone: hitMilestone,
      });
      void saveData(KEYS.STREAK, { streakCount: newStreak, lastChatDate: today });
    },

    addCoins: (amount: number) => {
      set((s) => ({ coins: s.coins + amount }));
    },

    spendCoins: (amount: number): boolean => {
      const { coins } = get();
      if (coins < amount) return false;
      set({ coins: coins - amount });
      return true;
    },

    clearStreakMilestone: () => set({ pendingStreakMilestone: null }),

    setPremium: (val: boolean) => {
      set({ isPremium: val });
      void persistUser(get());
    },

    login: async (email: string, password: string) => {
      if (!isSupabaseConfigured()) {
        return {
          ok: false,
          error: 'Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
        };
      }

      try {
        const session = await signInWithEmail(sanitizeEmail(email), password);
        return completeLoginFromSession(session);
      } catch (error) {
        return { ok: false, error: normalizeAuthError(error) };
      }
    },

    signup: async (email: string, password: string) => {
      if (!isSupabaseConfigured()) {
        return {
          ok: false,
          error: 'Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
        };
      }

      try {
        const { session, user } = await signUpWithEmail(sanitizeEmail(email), password);

        if (!session) {
          return {
            ok: true,
            pendingVerification: true,
            error: user?.email
              ? `Verification email sent to ${user.email}. Please confirm then login.`
              : 'Verification email sent. Please confirm then login.',
          };
        }

        return completeLoginFromSession(session);
      } catch (error) {
        return { ok: false, error: normalizeAuthError(error) };
      }
    },

    resendVerificationEmail: async (email: string) => {
      if (!isSupabaseConfigured()) {
        return {
          ok: false,
          error: 'Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
        };
      }

      try {
        await resendSignupVerificationEmail(sanitizeEmail(email));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: normalizeAuthError(error) };
      }
    },

    logout: async () => {
      const currentSession = get().authSession;
      if (currentSession) {
        try {
          await supabaseSignOut(currentSession.accessToken);
        } catch (error) {
          console.warn('Supabase logout failed:', error);
        }
      }

      set({
        authSession: null,
        userId: '',
        email: '',
        name: '',
        favoriteCharacters: [],
        onboarded: false,
        loggedIn: false,
      });

      await Promise.all([persistSession(null), persistUser(get())]);
    },

    setName: (name: string) => {
      const nextName = sanitizeName(name);
      set({ name: nextName });
      void persistUser(get());
      void syncProfileIfPossible();
    },

    setFavoriteCharacters: (ids: string[]) => {
      set({ favoriteCharacters: ids });
      void persistUser(get());
      void syncProfileIfPossible();
    },

    completeOnboarding: () => {
      set({ onboarded: true, loggedIn: true });
      void persistUser(get());
      void syncProfileIfPossible();
    },

    setBio: (bio: string) => {
      set({ bio });
      void persistUser(get());
      void syncProfileIfPossible();
    },

    setPreferredLanguage: (lang: string) => {
      set({ preferredLanguage: lang });
      void persistUser(get());
    },

    blockUser: async (targetId: string) => {
      const state = get();
      if (!state.authSession || !state.userId) return;
      const updated = [...new Set([...state.blockedUserIds, targetId])];
      set({ blockedUserIds: updated });
      try {
        await supabaseBlockUser(state.authSession.accessToken, state.userId, targetId);
      } catch {
        // Revert optimistic update on failure
        set({ blockedUserIds: state.blockedUserIds });
      }
    },

    unblockUser: async (targetId: string) => {
      const state = get();
      if (!state.authSession || !state.userId) return;
      const updated = state.blockedUserIds.filter((id) => id !== targetId);
      set({ blockedUserIds: updated });
      try {
        await supabaseUnblockUser(state.authSession.accessToken, state.userId, targetId);
      } catch {
        set({ blockedUserIds: state.blockedUserIds });
      }
    },

    isBlocked: (targetId: string) => get().blockedUserIds.includes(targetId),

    updateAvatar: async (imageUri: string, mimeType: string = 'image/jpeg') => {
      const state = get();
      if (!state.authSession || !state.userId || !state.email) return;
      const url = await uploadAvatar(state.authSession.accessToken, state.userId, imageUri, mimeType);
      set({ avatarUrl: url });
      void persistUser(get());
      await upsertProfile(state.authSession.accessToken, {
        id: state.userId,
        email: state.email,
        avatar_url: url,
      });
    },

    hydrate: async () => {
      const [savedUser, savedSession, savedStreak] = await Promise.all([
        loadData<Partial<UserProfile>>(KEYS.USER),
        loadData<SupabaseSession | null>(KEYS.AUTH_SESSION),
        loadData<{ streakCount: number; lastChatDate: string | null }>(KEYS.STREAK),
      ]);

      if (savedUser) {
        set({
          userId: savedUser.userId || '',
          email: savedUser.email || '',
          name: savedUser.name || '',
          favoriteCharacters: savedUser.favoriteCharacters || [],
          onboarded: Boolean(savedUser.onboarded),
          loggedIn: Boolean(savedUser.loggedIn),
          streakCount: savedUser.streakCount ?? savedStreak?.streakCount ?? 0,
          lastChatDate: savedUser.lastChatDate ?? savedStreak?.lastChatDate ?? null,
          avatarUrl: savedUser.avatarUrl || undefined,
          bio: savedUser.bio || undefined,
          preferredLanguage: savedUser.preferredLanguage || 'en-IN',
          coins: savedUser.coins || 0,
          isPremium: savedUser.isPremium || false,
        });
      }

      if (!savedSession || !isSupabaseConfigured()) {
        set({ authSession: null, loggedIn: false });
        await Promise.all([persistSession(null), persistUser(get())]);
        return;
      }

      try {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const shouldRefresh = savedSession.expiresAt <= nowInSeconds + SESSION_REFRESH_BUFFER_SECONDS;
        const activeSession = shouldRefresh
          ? await refreshSupabaseSession(savedSession.refreshToken)
          : savedSession;

        const result = await completeLoginFromSession(activeSession);
        if (!result.ok) {
          throw new Error(result.error || 'Session restore failed');
        }
      } catch {
        set({ authSession: null, loggedIn: false });
        await Promise.all([persistSession(null), persistUser(get())]);
      }
    },
  };
});
