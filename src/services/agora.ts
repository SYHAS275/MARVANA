/**
 * Agora RTC service for voice and video calls.
 *
 * Setup:
 * 1. npm install react-native-agora
 * 2. npx expo prebuild
 * 3. Replace AGORA_APP_ID below with your App ID from console.agora.io
 *
 * For testing: disable token auth in your Agora project (Project Management → No Token)
 * For production: set up a token server and replace '' with a real token in joinAgoraCall
 */

// ─── Replace this with your Agora App ID ────────────────────────────────────
export const AGORA_APP_ID = '6b1860673b2948d787c8b03aa00cc10e';
// ────────────────────────────────────────────────────────────────────────────

let engine: any = null;
let isInitialized = false;

/**
 * Initialize the Agora RTC engine.
 * Call once before joining any channel.
 */
export async function initAgoraEngine(): Promise<void> {
  if (isInitialized) return;
  try {
    const { createAgoraRtcEngine } = await import('react-native-agora');
    engine = createAgoraRtcEngine();
    engine.initialize({
      appId: AGORA_APP_ID,
      logConfig: { level: 0x0001 }, // warn only
    });
    isInitialized = true;
  } catch (e) {
    console.warn('[Agora] Failed to initialize engine — is react-native-agora installed?', e);
  }
}

/**
 * Join a voice or video call channel.
 * channelId should be the call record ID from Supabase (same for both parties).
 * uid is a numeric identifier for this user (hash of userId).
 */
export async function joinAgoraChannel(
  channelId: string,
  uid: number,
  isVideo: boolean,
): Promise<void> {
  if (!engine) {
    await initAgoraEngine();
    if (!engine) return;
  }
  const { ChannelProfileType, ClientRoleType } = await import('react-native-agora');

  await engine.enableAudio();
  if (isVideo) await engine.enableVideo();

  await engine.joinChannel(
    '', // token — replace with real token for production
    channelId,
    uid,
    {
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      autoSubscribeAudio: true,
      autoSubscribeVideo: isVideo,
      publishMicrophoneTrack: true,
      publishCameraTrack: isVideo,
    },
  );
}

/**
 * Leave the current channel and release the engine.
 */
export async function leaveAgoraChannel(): Promise<void> {
  if (!engine) return;
  try {
    await engine.leaveChannel();
    engine.release();
  } catch {}
  engine = null;
  isInitialized = false;
}

/** Mute/unmute local microphone */
export function setAgoraMuted(muted: boolean): void {
  engine?.muteLocalAudioStream(muted);
}

/** Switch audio output between earpiece and speakerphone */
export function setAgoraSpeaker(enabled: boolean): void {
  engine?.setEnableSpeakerphone(enabled);
}

/** Enable/disable local camera (video calls) */
export function setAgoraVideoEnabled(enabled: boolean): void {
  engine?.muteLocalVideoStream(!enabled);
}

/** Register event callbacks on the engine */
export function addAgoraListeners(callbacks: {
  onUserJoined?: (uid: number) => void;
  onUserOffline?: (uid: number) => void;
  onError?: (code: number) => void;
}): void {
  if (!engine) return;
  engine.addListener('onUserJoined', (_connection: any, uid: number) => {
    callbacks.onUserJoined?.(uid);
  });
  engine.addListener('onUserOffline', (_connection: any, uid: number, _reason: any) => {
    callbacks.onUserOffline?.(uid);
  });
  engine.addListener('onError', (code: number, _msg: string) => {
    callbacks.onError?.(code);
  });
}

/** Remove all Agora event listeners */
export function removeAgoraListeners(): void {
  engine?.removeAllListeners();
}

/** Convert a string userId to a stable numeric Agora UID */
export function userIdToAgoraUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100_000_000; // Agora UID must be < 2^32
}
