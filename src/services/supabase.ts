
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
  public_key: string | null;
  bio?: string | null;
  message_count?: number;
  streak_count?: number;
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

export async function restRequest<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
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
    public_key?: string;
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
    `/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,name,favorite_characters,onboarded,avatar_url,public_key`,
    accessToken,
    { method: 'GET' }
  );

  return rows[0] || null;
}

/** Fetch just the public key for another user (for E2E encryption) */
export async function fetchUserPublicKey(
  accessToken: string,
  userId: string,
): Promise<string | null> {
  try {
    const rows = await restRequest<{ public_key: string | null }[]>(
      `/profiles?id=eq.${encodeURIComponent(userId)}&select=public_key&limit=1`,
      accessToken,
      { method: 'GET' },
    );
    return rows[0]?.public_key || null;
  } catch {
    return null;
  }
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

  // Read the local file as an ArrayBuffer — recommended by Supabase for React Native
  const arrayBuffer = await fetch(imageUri).then((r) => r.arrayBuffer());

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
    body: arrayBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Avatar upload failed (${uploadRes.status}): ${err}`);
  }

  // Bust CDN cache with timestamp
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

export type AttachmentType = 'image' | 'video' | 'pdf' | 'document' | 'location' | 'gif' | 'sticker';

export interface DMAttachment {
  url: string;
  type: AttachmentType;
  name: string;
  size: number; // bytes
  mime: string;
  width?: number;
  height?: number;
  duration?: number; // seconds, for video
  // location-specific fields
  lat?: number;
  lng?: number;
  address?: string;
  placeName?: string;
}

export interface DMMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string;
  attachment?: DMAttachment | null;
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
    `/dm_messages?room_id=eq.${roomId}${afterParam}&select=id,room_id,sender_id,content,created_at,reply_to_id,attachment&order=created_at.asc&limit=100`,
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
  await restRequest(`/profiles?id=eq.${encodeURIComponent(userId)}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ last_seen: new Date().toISOString() }),
  });
}

/** Get last_seen for a user — returns true if online (< 3 min ago) */
export async function isUserOnline(accessToken: string, userId: string): Promise<boolean> {
  const rows = await restRequest<{ last_seen: string }[]>(
    `/profiles?id=eq.${encodeURIComponent(userId)}&select=last_seen`, accessToken, { method: 'GET' }
  );
  if (!rows[0]?.last_seen) return false;
  return Date.now() - new Date(rows[0].last_seen).getTime() < 3 * 60 * 1000;
}

/** Upload a file to the dm-attachments Supabase Storage bucket. Returns public URL. */
export async function uploadDMAttachment(
  accessToken: string,
  senderId: string,
  fileUri: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const { supabaseUrl, supabaseAnonKey } = getConfig();

  const ext = fileName.split('.').pop() || 'bin';
  const path = `${senderId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/dm-attachments/${path}`;

  // Read the local file as an ArrayBuffer (raw binary) — recommended by Supabase for React Native
  // fetch(fileUri).arrayBuffer() works for file:// URIs returned by image/document pickers
  const arrayBuffer = await fetch(fileUri).then((r) => r.arrayBuffer());

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    },
    body: arrayBuffer,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Upload failed (${res.status}): ${errText}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/dm-attachments/${path}`;
}

/** Send a message in a DM room */
export async function sendDMMessage(
  accessToken: string,
  roomId: string,
  senderId: string,
  content: string,
  replyToId?: string,
  attachment?: DMAttachment,
): Promise<DMMessage> {
  const rows = await restRequest<DMMessage[]>(
    `/dm_messages`,
    accessToken,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        room_id: roomId,
        sender_id: senderId,
        content,
        reply_to_id: replyToId || null,
        attachment: attachment || null,
      }),
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
  await restRequest(`/calls?id=eq.${encodeURIComponent(callId)}`, accessToken, {
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
  await restRequest(`/calls?id=eq.${encodeURIComponent(callId)}`, accessToken, {
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
      `/calls?to_id=eq.${encodeURIComponent(myId)}&status=eq.ringing&order=created_at.desc&limit=1`,
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
      `/calls?id=eq.${encodeURIComponent(callId)}&limit=1`,
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

export type StoryMediaType = 'image' | 'video' | null;

export interface Story {
  id: string;
  user_id: string;
  content: string;
  emoji: string;
  bg_color: string;
  created_at: string;
  expires_at: string;
  is_collab?: boolean;
  author_name?: string;
  author_avatar?: string;
  media_url?: string | null;
  media_type?: StoryMediaType;
  media_mime?: string | null;
}

/** Upload a story media file (photo/video) to Supabase Storage. Returns public URL. */
export async function uploadStoryMedia(
  accessToken: string,
  userId: string,
  fileUri: string,
  mimeType: string,
): Promise<string> {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const ext = mimeType.includes('video') ? 'mp4' : mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/story-media/${path}`;

  const arrayBuffer = await fetch(fileUri).then((r) => r.arrayBuffer());

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    },
    body: arrayBuffer,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Story media upload failed (${res.status}): ${errText}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/story-media/${path}`;
}

export async function postStory(
  accessToken: string,
  userId: string,
  content: string,
  emoji: string,
  bgColor: string,
  isCollab = false,
  mediaUrl?: string | null,
  mediaType?: StoryMediaType,
  mediaMime?: string | null,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await restRequest('/stories', accessToken, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId, content, emoji, bg_color: bgColor, expires_at: expiresAt,
      is_collab: isCollab, collab_owner_id: isCollab ? userId : null,
      ...(mediaUrl ? { media_url: mediaUrl, media_type: mediaType, media_mime: mediaMime } : {}),
    }),
  });
}

export async function fetchStories(accessToken: string): Promise<Story[]> {
  const rows = await restRequest<(Story & { profiles: { name: string | null; avatar_url: string | null } | null })[]>(
    `/stories?expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=50&select=id,user_id,content,emoji,bg_color,created_at,expires_at,is_collab,media_url,media_type,media_mime,profiles!stories_user_id_fkey(name,avatar_url)`,
    accessToken, { method: 'GET' }
  );
  return rows.map((s) => ({
    ...s,
    author_name: s.profiles?.name || undefined,
    author_avatar: s.profiles?.avatar_url || undefined,
    profiles: undefined,
  }));
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

// ── Story Comments ────────────────────────────────────────────────────────────

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export async function fetchStoryComments(accessToken: string, storyId: string): Promise<StoryComment[]> {
  const rows = await restRequest<(StoryComment & { profiles: { name: string | null } | null })[]>(
    `/story_comments?story_id=eq.${storyId}&order=created_at.asc&select=id,story_id,user_id,content,created_at,profiles(name)`,
    accessToken, { method: 'GET' }
  );
  return rows.map((r) => ({ ...r, author_name: r.profiles?.name || undefined, profiles: undefined }));
}

export async function postStoryComment(accessToken: string, storyId: string, userId: string, content: string): Promise<StoryComment> {
  const rows = await restRequest<StoryComment[]>('/story_comments', accessToken, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ story_id: storyId, user_id: userId, content }),
  });
  return rows[0];
}

export async function deleteStoryComment(accessToken: string, commentId: string): Promise<void> {
  await restRequest(`/story_comments?id=eq.${commentId}`, accessToken, { method: 'DELETE' });
}

// ── Friend Requests ───────────────────────────────────────────────────────────

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  from_id: string;
  to_id: string;
  status: FriendRequestStatus;
  created_at: string;
  from_profile?: { name: string | null; avatar_url: string | null };
}

export async function sendFriendRequest(accessToken: string, fromId: string, toId: string): Promise<void> {
  await restRequest('/friend_requests', accessToken, {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ from_id: fromId, to_id: toId }),
  });
}

export async function respondFriendRequest(accessToken: string, requestId: string, status: 'accepted' | 'declined'): Promise<void> {
  await restRequest(`/friend_requests?id=eq.${requestId}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status }),
  });
}

export async function getPendingFriendRequests(accessToken: string, userId: string): Promise<FriendRequest[]> {
  const rows = await restRequest<(FriendRequest & { profiles: { name: string | null; avatar_url: string | null } | null })[]>(
    `/friend_requests?to_id=eq.${userId}&status=eq.pending&order=created_at.desc&select=id,from_id,to_id,status,created_at,profiles!friend_requests_from_id_fkey(name,avatar_url)`,
    accessToken, { method: 'GET' }
  );
  return rows.map((r) => ({ ...r, from_profile: r.profiles || undefined, profiles: undefined }));
}

export async function getFriendRequestStatus(accessToken: string, fromId: string, toId: string): Promise<FriendRequestStatus | null> {
  const rows = await restRequest<{ status: FriendRequestStatus }[]>(
    `/friend_requests?from_id=eq.${fromId}&to_id=eq.${toId}&select=status&limit=1`,
    accessToken, { method: 'GET' }
  );
  return rows[0]?.status || null;
}

export async function areFriends(accessToken: string, userId1: string, userId2: string): Promise<boolean> {
  const rows = await restRequest<{ id: string }[]>(
    `/friend_requests?or=(and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1}))&status=eq.accepted&select=id&limit=1`,
    accessToken, { method: 'GET' }
  );
  return rows.length > 0;
}

export async function cancelFriendRequest(accessToken: string, fromId: string, toId: string): Promise<void> {
  await restRequest(`/friend_requests?from_id=eq.${fromId}&to_id=eq.${toId}`, accessToken, { method: 'DELETE' });
}

// ── User Public Profile ───────────────────────────────────────────────────────

export interface PublicProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  message_count: number;
  streak_count: number;
  created_at: string;
}

export async function fetchPublicProfile(accessToken: string, userId: string): Promise<PublicProfile | null> {
  const rows = await restRequest<PublicProfile[]>(
    `/profiles?id=eq.${userId}&select=id,name,email,avatar_url,bio,message_count,streak_count,created_at&limit=1`,
    accessToken, { method: 'GET' }
  );
  return rows[0] || null;
}

export async function updateBio(accessToken: string, userId: string, bio: string): Promise<void> {
  await restRequest(`/profiles?id=eq.${userId}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ bio }),
  });
}

// ── User Status ───────────────────────────────────────────────────────────────

export interface UserStatus {
  user_id: string;
  name: string | null;
  status_text: string | null;
  status_emoji: string | null;
  status_updated_at: string | null;
}

export async function setUserStatus(
  accessToken: string,
  userId: string,
  statusText: string | null,
  statusEmoji: string | null,
): Promise<void> {
  await restRequest(`/profiles?id=eq.${userId}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      status_text: statusText,
      status_emoji: statusEmoji,
      status_updated_at: statusText ? new Date().toISOString() : null,
    }),
  });
}

export async function fetchContactStatuses(
  accessToken: string,
  userIds: string[],
): Promise<UserStatus[]> {
  if (userIds.length === 0) return [];
  const ids = userIds.map((id) => `"${id}"`).join(',');
  return restRequest<UserStatus[]>(
    `/profiles?id=in.(${ids})&select=id,name,status_text,status_emoji,status_updated_at`,
    accessToken,
    { method: 'GET' },
  ).then((rows: any[]) => rows.map((r) => ({ ...r, user_id: r.id })));
}

export async function getMyStatus(accessToken: string, userId: string): Promise<{ status_text: string | null; status_emoji: string | null }> {
  const rows = await restRequest<{ status_text: string | null; status_emoji: string | null }[]>(
    `/profiles?id=eq.${userId}&select=status_text,status_emoji&limit=1`,
    accessToken,
    { method: 'GET' },
  );
  return rows[0] || { status_text: null, status_emoji: null };
}

// ── Account Deletion ─────────────────────────────────────────────────────────

export async function deleteAccount(accessToken: string, userId: string): Promise<void> {
  // Delete profile — cascade will remove most data via FK
  await restRequest(`/profiles?id=eq.${userId}`, accessToken, { method: 'DELETE' });
  await supabaseSignOut(accessToken);
}

// ── Public Rooms ─────────────────────────────────────────────────────────────

export interface PublicRoom {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  topic: string | null;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
  max_members: number;
  member_count: number;
}

export interface PublicRoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

export interface PublicRoomMember {
  room_id: string;
  user_id: string;
  joined_at: string;
}

/** Fetch all active public rooms, ordered by member_count desc */
export async function fetchPublicRooms(accessToken: string): Promise<PublicRoom[]> {
  return restRequest<PublicRoom[]>(
    '/public_rooms?is_active=eq.true&select=id,name,description,emoji,topic,created_by,created_at,is_active,max_members,member_count&order=member_count.desc',
    accessToken,
    { method: 'GET' },
  );
}

/** Create a new public room and auto-join the creator */
export async function createPublicRoom(
  accessToken: string,
  userId: string,
  name: string,
  description: string | null,
  emoji: string,
  topic: string | null,
): Promise<PublicRoom> {
  const rows = await restRequest<PublicRoom[]>(
    '/public_rooms',
    accessToken,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name, description, emoji, topic, created_by: userId, member_count: 1 }),
    },
  );
  const room = rows[0];
  // Auto-join creator
  await restRequest('/public_room_members', accessToken, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ room_id: room.id, user_id: userId }),
  });
  return room;
}

/** Join a public room */
export async function joinPublicRoom(accessToken: string, roomId: string, userId: string): Promise<void> {
  // Insert member
  await restRequest('/public_room_members', accessToken, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ room_id: roomId, user_id: userId }),
  });
  // Increment member_count via RPC-style PATCH (read current, increment)
  const rooms = await restRequest<PublicRoom[]>(
    `/public_rooms?id=eq.${roomId}&select=member_count`,
    accessToken,
    { method: 'GET' },
  );
  const current = rooms[0]?.member_count ?? 0;
  await restRequest(`/public_rooms?id=eq.${roomId}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ member_count: current + 1 }),
  });
}

/** Leave a public room */
export async function leavePublicRoom(accessToken: string, roomId: string, userId: string): Promise<void> {
  await restRequest(
    `/public_room_members?room_id=eq.${roomId}&user_id=eq.${userId}`,
    accessToken,
    { method: 'DELETE' },
  );
  const rooms = await restRequest<PublicRoom[]>(
    `/public_rooms?id=eq.${roomId}&select=member_count`,
    accessToken,
    { method: 'GET' },
  );
  const current = rooms[0]?.member_count ?? 1;
  await restRequest(`/public_rooms?id=eq.${roomId}`, accessToken, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ member_count: Math.max(0, current - 1) }),
  });
}

/** Fetch messages for a room, ordered by created_at asc */
export async function fetchRoomMessages(
  accessToken: string,
  roomId: string,
  limit: number = 50,
): Promise<PublicRoomMessage[]> {
  return restRequest<PublicRoomMessage[]>(
    `/public_room_messages?room_id=eq.${roomId}&select=id,room_id,sender_id,sender_name,sender_avatar,content,created_at&order=created_at.asc&limit=${limit}`,
    accessToken,
    { method: 'GET' },
  );
}

/** Send a message to a public room */
export async function sendRoomMessage(
  accessToken: string,
  roomId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | null,
  content: string,
): Promise<PublicRoomMessage> {
  const rows = await restRequest<PublicRoomMessage[]>(
    '/public_room_messages',
    accessToken,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        room_id: roomId,
        sender_id: senderId,
        sender_name: senderName,
        sender_avatar: senderAvatar,
        content,
      }),
    },
  );
  return rows[0];
}

/** Check if current user is a member of a room */
export async function checkRoomMembership(
  accessToken: string,
  roomId: string,
  userId: string,
): Promise<boolean> {
  const rows = await restRequest<PublicRoomMember[]>(
    `/public_room_members?room_id=eq.${roomId}&user_id=eq.${userId}&select=room_id&limit=1`,
    accessToken,
    { method: 'GET' },
  );
  return rows.length > 0;
}
