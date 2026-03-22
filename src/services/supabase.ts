interface SupabaseUser {
  id: string;
  email?: string;
}

export interface SupabaseSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  user: SupabaseUser;
}

export interface UserProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  favorite_characters: string[] | null;
  onboarded: boolean | null;
  avatar_url: string | null;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function hasConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function getConfig() {
  if (!hasConfig()) {
    throw new Error('Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY).');
  }
  return { supabaseUrl: supabaseUrl as string, supabaseAnonKey: supabaseAnonKey as string };
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await parseJson<{ error_description?: string; msg?: string; error?: string } & T>(response);

  if (!response.ok) {
    throw new Error(body.error_description || body.msg || body.error || 'Supabase auth request failed');
  }

  return body as T;
}

function toSession(payload: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: SupabaseUser;
}): SupabaseSession {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_at || nowInSeconds + (payload.expires_in || 3600),
    tokenType: payload.token_type || 'bearer',
    user: payload.user || { id: '' },
  };
}

export function isSupabaseConfigured(): boolean {
  return hasConfig();
}

export async function signUpWithEmail(email: string, password: string): Promise<{ session: SupabaseSession | null; user: SupabaseUser | null }> {
  const data = await authRequest<{
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
    token_type?: string;
    user?: SupabaseUser;
  }>('/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const session = data.access_token && data.refresh_token ? toSession(data as Required<typeof data>) : null;
  return { session, user: data.user || null };
}

export async function resendSignupVerificationEmail(email: string): Promise<void> {
  await authRequest('/resend', {
    method: 'POST',
    body: JSON.stringify({ type: 'signup', email }),
  });
}

export async function signInWithEmail(email: string, password: string): Promise<SupabaseSession> {
  const data = await authRequest<{
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
    token_type?: string;
    user?: SupabaseUser;
  }>('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return toSession(data);
}

export async function refreshSupabaseSession(refreshToken: string): Promise<SupabaseSession> {
  const data = await authRequest<{
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
    token_type?: string;
    user?: SupabaseUser;
  }>('/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  return toSession(data);
}

export async function getCurrentUser(accessToken: string): Promise<SupabaseUser> {
  return authRequest<SupabaseUser>('/user', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function supabaseSignOut(accessToken: string): Promise<void> {
  await authRequest('/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function restRequest<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await parseJson<T & { message?: string; error?: string }>(response);
  if (!response.ok) {
    throw new Error(body.message || body.error || 'Supabase data request failed');
  }
  return body as T;
}

export async function upsertProfile(
  accessToken: string,
  profile: {
    id: string;
    email: string;
    name?: string;
    favorite_characters?: string[];
    onboarded?: boolean;
    avatar_url?: string;
  }
): Promise<void> {
  await restRequest('/profiles?on_conflict=id', accessToken, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(profile),
  });
}

export async function fetchProfile(accessToken: string, userId: string): Promise<UserProfileRow | null> {
  const rows = await restRequest<UserProfileRow[]>(
    `/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,name,favorite_characters,onboarded,avatar_url`,
    accessToken,
    { method: 'GET' }
  );

  return rows[0] || null;
}

export async function uploadAvatar(
  accessToken: string,
  userId: string,
  imageUri: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const { supabaseUrl, supabaseAnonKey } = getConfig();

  const fileName = `${userId}/avatar.jpg`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/avatars/${fileName}`;

  // React Native requires FormData — blob approach doesn't work with local file URIs
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: 'avatar.jpg',
    type: mimeType,
  } as any);

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'x-upsert': 'true',
      // Do NOT set Content-Type — let FormData set it with the multipart boundary
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Avatar upload failed: ${err}`);
  }

  // Add timestamp to bust cache when user re-uploads
  return `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}?t=${Date.now()}`;
}

// ── DM (user-to-user) chat ──────────────────────────────────────────────────

export interface DMRoom {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other_user?: UserProfileRow;
  last_message?: string;
  last_message_time?: string;
}

export interface DMMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string;
}

/** Search users by name or email (excludes self) */
export async function searchUsers(accessToken: string, query: string): Promise<UserProfileRow[]> {
  const q = encodeURIComponent(query.trim());
  return restRequest<UserProfileRow[]>(
    `/profiles?or=(name.ilike.*${q}*,email.ilike.*${q}*)&select=id,email,name&limit=20`,
    accessToken,
    { method: 'GET' }
  );
}

/** Fetch suggested users (newest profiles, excludes self) */
export async function getSuggestedUsers(accessToken: string, excludeId: string): Promise<UserProfileRow[]> {
  const rows = await restRequest<UserProfileRow[]>(
    `/profiles?id=neq.${excludeId}&select=id,email,name&order=created_at.desc&limit=20`,
    accessToken,
    { method: 'GET' }
  );
  return rows;
}

/** Get or create a DM room between two users. Returns room id. */
export async function getOrCreateDMRoom(accessToken: string, myId: string, otherId: string): Promise<string> {
  const [u1, u2] = [myId, otherId].sort(); // canonical order
  // Try to find existing
  const existing = await restRequest<{ id: string }[]>(
    `/dm_rooms?user1_id=eq.${u1}&user2_id=eq.${u2}&select=id&limit=1`,
    accessToken,
    { method: 'GET' }
  );
  if (existing[0]) return existing[0].id;

  // Create new
  const created = await restRequest<{ id: string }[]>(
    `/dm_rooms`,
    accessToken,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user1_id: u1, user2_id: u2 }),
    }
  );
  return created[0].id;
}

/** Fetch all DM rooms for current user */
export async function fetchDMRooms(accessToken: string, myId: string): Promise<DMRoom[]> {
  const rooms = await restRequest<DMRoom[]>(
    `/dm_rooms?or=(user1_id.eq.${myId},user2_id.eq.${myId})&select=id,user1_id,user2_id,created_at&order=created_at.desc`,
    accessToken,
    { method: 'GET' }
  );
  return rooms;
}

/** Fetch messages in a room, optionally only after a given ISO timestamp */
export async function fetchDMMessages(accessToken: string, roomId: string, after?: string): Promise<DMMessage[]> {
  const afterParam = after ? `&created_at=gt.${encodeURIComponent(after)}` : '';
  return restRequest<DMMessage[]>(
    `/dm_messages?room_id=eq.${roomId}${afterParam}&order=created_at.asc&limit=100`,
    accessToken,
    { method: 'GET' }
  );
}

/** Mark messages in a room as read (update last_read_at) */
export async function markRoomRead(accessToken: string, roomId: string, userId: string): Promise<void> {
  await restRequest('/room_read_status?on_conflict=room_id,user_id', accessToken, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ room_id: roomId, user_id: userId, read_at: new Date().toISOString() }),
  });
}

/** Get read status for a room (returns read_at of the OTHER user) */
export async function getRoomReadStatus(accessToken: string, roomId: string, otherId: string): Promise<string | null> {
  const rows = await restRequest<{ read_at: string }[]>(
    `/room_read_status?room_id=eq.${roomId}&user_id=eq.${otherId}&select=read_at`,
    accessToken, { method: 'GET' }
  );
  return rows[0]?.read_at || null;
}

/** Update last_seen for online status */
export async function updateLastSeen(accessToken: string, userId: string): Promise<void> {
  await restRequest('/profiles?id=eq.' + userId, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ last_seen: new Date().toISOString() }),
  });
}

/** Get last_seen for a user — returns true if online (< 3 min ago) */
export async function isUserOnline(accessToken: string, userId: string): Promise<boolean> {
  const rows = await restRequest<{ last_seen: string }[]>(
    `/profiles?id=eq.${userId}&select=last_seen`, accessToken, { method: 'GET' }
  );
  if (!rows[0]?.last_seen) return false;
  return Date.now() - new Date(rows[0].last_seen).getTime() < 3 * 60 * 1000;
}

/** Send a message in a DM room */
export async function sendDMMessage(accessToken: string, roomId: string, senderId: string, content: string, replyToId?: string): Promise<DMMessage> {
  const rows = await restRequest<DMMessage[]>(
    `/dm_messages`,
    accessToken,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ room_id: roomId, sender_id: senderId, content, reply_to_id: replyToId || null }),
    }
  );
  return rows[0];
}

// ── Follow System ────────────────────────────────────────────────────────────

/** Follow a user */
export async function followUser(accessToken: string, followerId: string, followingId: string): Promise<void> {
  await restRequest(
    '/follows',
    accessToken,
    {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ follower_id: followerId, following_id: followingId }),
    }
  );
}

/** Unfollow a user */
export async function unfollowUser(accessToken: string, followerId: string, followingId: string): Promise<void> {
  await restRequest(
    `/follows?follower_id=eq.${followerId}&following_id=eq.${followingId}`,
    accessToken,
    { method: 'DELETE' }
  );
}

/** Check if current user follows target */
export async function checkFollowing(accessToken: string, followerId: string, followingId: string): Promise<boolean> {
  const rows = await restRequest<{ follower_id: string }[]>(
    `/follows?follower_id=eq.${followerId}&following_id=eq.${followingId}&select=follower_id&limit=1`,
    accessToken,
    { method: 'GET' }
  );
  return rows.length > 0;
}

/** Get follower + following counts */
export async function getFollowCounts(accessToken: string, userId: string): Promise<{ followers: number; following: number }> {
  const [followerRows, followingRows] = await Promise.all([
    restRequest<{ follower_id: string }[]>(`/follows?following_id=eq.${userId}&select=follower_id`, accessToken, { method: 'GET' }),
    restRequest<{ following_id: string }[]>(`/follows?follower_id=eq.${userId}&select=following_id`, accessToken, { method: 'GET' }),
  ]);
  return { followers: followerRows.length, following: followingRows.length };
}

/** Increment message count on profile (call after sending a message) */
export async function incrementMessageCount(accessToken: string, userId: string): Promise<void> {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  await fetch(`${supabaseUrl}/rest/v1/rpc/increment_messages`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });
}

// ── DM Message Reactions ────────────────────────────────────────────────────

export interface DMReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export async function addDMReaction(
  accessToken: string,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  await restRequest('/dm_reactions?on_conflict=message_id,user_id', accessToken, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ message_id: messageId, user_id: userId, emoji }),
  });
}

export async function removeDMReaction(
  accessToken: string,
  messageId: string,
  userId: string,
): Promise<void> {
  await restRequest(
    `/dm_reactions?message_id=eq.${messageId}&user_id=eq.${userId}`,
    accessToken,
    { method: 'DELETE' },
  );
}

export async function fetchDMReactions(
  accessToken: string,
  roomId: string,
): Promise<DMReaction[]> {
  return restRequest<DMReaction[]>(
    `/dm_reactions?select=message_id,user_id,emoji&message_id=in.(select id from dm_messages where room_id=eq.${roomId})`,
    accessToken,
    { method: 'GET' },
  );
}

// ── Typing indicators ───────────────────────────────────────────────────────

/** Upsert typing status — call while user types, remove when done */
export async function setTypingStatus(
  accessToken: string,
  roomId: string,
  userId: string,
  isTyping: boolean,
): Promise<void> {
  if (isTyping) {
    await restRequest('/typing_status?on_conflict=room_id,user_id', accessToken, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ room_id: roomId, user_id: userId, updated_at: new Date().toISOString() }),
    });
  } else {
    await restRequest(
      `/typing_status?room_id=eq.${roomId}&user_id=eq.${userId}`,
      accessToken,
      { method: 'DELETE' },
    );
  }
}

/** Returns true if the given user has typed within the last 4 seconds */
export async function getTypingStatus(
  accessToken: string,
  roomId: string,
  userId: string,
): Promise<boolean> {
  const rows = await restRequest<{ updated_at: string }[]>(
    `/typing_status?room_id=eq.${roomId}&user_id=eq.${userId}&select=updated_at`,
    accessToken,
    { method: 'GET' },
  );
  if (!rows[0]) return false;
  const age = Date.now() - new Date(rows[0].updated_at).getTime();
  return age < 4000; // typing if updated < 4s ago
}

// ── Report & Block ──────────────────────────────────────────────────────────

export type ReportReason =
  | 'harassment'
  | 'hate_speech'
  | 'spam'
  | 'inappropriate_content'
  | 'fake_account'
  | 'other';

/** Submit a report against a user */
export async function reportUser(
  accessToken: string,
  reporterId: string,
  reportedId: string,
  reason: ReportReason,
  messageContent?: string,
): Promise<void> {
  await restRequest('/reports', accessToken, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      message_content: messageContent || null,
    }),
  });
}

/** Block a user — prevents them appearing in searches and DMs */
export async function blockUser(
  accessToken: string,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  await restRequest('/blocked_users', accessToken, {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ blocker_id: blockerId, blocked_id: blockedId }),
  });
}

// ─── CALL SIGNALING ──────────────────────────────────────────────────────────

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'active' | 'declined' | 'ended' | 'missed';

export interface CallRecord {
  id: string;
  from_id: string;
  to_id: string;
  type: CallType;
  status: CallStatus;
  created_at: string;
}

/** Initiate a call to another user. Returns the call record id. */
export async function initiateCall(
  accessToken: string,
  fromId: string,
  toId: string,
  type: CallType = 'voice',
): Promise<string> {
  const rows = await restRequest<CallRecord[]>('/calls', accessToken, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ from_id: fromId, to_id: toId, type, status: 'ringing' }),
  });
  return rows[0].id;
}

/** Answer an incoming call */
export async function answerCall(accessToken: string, callId: string): Promise<void> {
  await restRequest(`/calls?id=eq.${callId}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'active' }),
  });
}

/** Decline or end a call */
export async function endCall(
  accessToken: string,
  callId: string,
  status: 'declined' | 'ended' | 'missed' = 'ended',
): Promise<void> {
  await restRequest(`/calls?id=eq.${callId}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status }),
  });
}

/** Poll for incoming ringing calls to this user (within last 30s) */
export async function checkIncomingCall(
  accessToken: string,
  myId: string,
): Promise<CallRecord | null> {
  try {
    const rows = await restRequest<CallRecord[]>(
      `/calls?to_id=eq.${myId}&status=eq.ringing&order=created_at.desc&limit=1`,
      accessToken,
      { method: 'GET' },
    );
    if (!rows[0]) return null;
    // Ignore calls older than 30 seconds
    const age = Date.now() - new Date(rows[0].created_at).getTime();
    return age < 30_000 ? rows[0] : null;
  } catch {
    return null;
  }
}

/** Fetch a single call record by id */
export async function getCallRecord(accessToken: string, callId: string): Promise<CallRecord | null> {
  try {
    const rows = await restRequest<CallRecord[]>(
      `/calls?id=eq.${callId}&limit=1`,
      accessToken,
      { method: 'GET' },
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Unblock a user */
export async function unblockUser(
  accessToken: string,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  await restRequest(
    `/blocked_users?blocker_id=eq.${blockerId}&blocked_id=eq.${blockedId}`,
    accessToken,
    { method: 'DELETE' },
  );
}

/** Fetch list of blocked user IDs for the current user */
export async function fetchBlockedIds(
  accessToken: string,
  blockerId: string,
): Promise<string[]> {
  const rows = await restRequest<{ blocked_id: string }[]>(
    `/blocked_users?blocker_id=eq.${blockerId}&select=blocked_id`,
    accessToken,
    { method: 'GET' },
  );
  return rows.map((r) => r.blocked_id);
}

// ── Stories (24hr) ───────────────────────────────────────────────────────────

export interface Story {
  id: string;
  user_id: string;
  content: string;
  emoji: string;
  bg_color: string;
  created_at: string;
  expires_at: string;
  author_name?: string;
  author_avatar?: string;
}

export async function postStory(
  accessToken: string,
  userId: string,
  content: string,
  emoji: string,
  bgColor: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await restRequest('/stories', accessToken, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, content, emoji, bg_color: bgColor, expires_at: expiresAt }),
  });
}

export async function fetchStories(accessToken: string): Promise<Story[]> {
  return restRequest<Story[]>(
    `/stories?expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=50&select=id,user_id,content,emoji,bg_color,created_at,expires_at`,
    accessToken, { method: 'GET' }
  );
}

export async function deleteStory(accessToken: string, storyId: string): Promise<void> {
  await restRequest(`/stories?id=eq.${storyId}`, accessToken, { method: 'DELETE' });
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url?: string;
  message_count: number;
  streak_count: number;
}

export async function fetchLeaderboard(accessToken: string): Promise<LeaderboardEntry[]> {
  return restRequest<LeaderboardEntry[]>(
    `/profiles?select=id,name,avatar_url,message_count,streak_count&order=message_count.desc&limit=20`,
    accessToken, { method: 'GET' }
  );
}

// ── Referrals ────────────────────────────────────────────────────────────────

export async function submitReferral(
  accessToken: string,
  referrerId: string,
  referredId: string,
): Promise<void> {
  await restRequest('/referrals', accessToken, {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ referrer_id: referrerId, referred_id: referredId }),
  });
}

export async function getReferralCode(userId: string): Promise<string> {
  return userId.slice(0, 8).toUpperCase();
}

// ── Account Deletion ─────────────────────────────────────────────────────────

export async function deleteAccount(accessToken: string, userId: string): Promise<void> {
  // Delete profile — cascade will remove most data via FK
  await restRequest(`/profiles?id=eq.${userId}`, accessToken, { method: 'DELETE' });
  await supabaseSignOut(accessToken);
}
