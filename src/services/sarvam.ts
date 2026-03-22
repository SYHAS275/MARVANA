import { Audio } from 'expo-av';

const SARVAM_API = 'https://api.sarvam.ai/text-to-speech';
const TRANSLATE_API = 'https://api.sarvam.ai/translate';

export interface SarvamLanguage {
  code: string;       // BCP-47 code for Sarvam
  label: string;      // Display name
  flag: string;       // Emoji flag
  script: string;     // Native script name
  speaker: string;    // Default speaker voice
}

export const SARVAM_LANGUAGES: SarvamLanguage[] = [
  { code: 'hi-IN', label: 'Hindi',      flag: '🇮🇳', script: 'हिंदी',     speaker: 'meera'    },
  { code: 'ta-IN', label: 'Tamil',      flag: '🇮🇳', script: 'தமிழ்',     speaker: 'pavithra' },
  { code: 'te-IN', label: 'Telugu',     flag: '🇮🇳', script: 'తెలుగు',    speaker: 'arvind'   },
  { code: 'kn-IN', label: 'Kannada',    flag: '🇮🇳', script: 'ಕನ್ನಡ',     speaker: 'amol'     },
  { code: 'ml-IN', label: 'Malayalam',  flag: '🇮🇳', script: 'മലയാളം',    speaker: 'meera'    },
  { code: 'bn-IN', label: 'Bengali',    flag: '🇮🇳', script: 'বাংলা',     speaker: 'meera'    },
  { code: 'mr-IN', label: 'Marathi',    flag: '🇮🇳', script: 'मराठी',     speaker: 'amartya'  },
  { code: 'gu-IN', label: 'Gujarati',   flag: '🇮🇳', script: 'ગુજરાતી',   speaker: 'meera'    },
  { code: 'pa-IN', label: 'Punjabi',    flag: '🇮🇳', script: 'ਪੰਜਾਬੀ',    speaker: 'meera'    },
  { code: 'od-IN', label: 'Odia',       flag: '🇮🇳', script: 'ଓଡ଼ିଆ',     speaker: 'meera'    },
  { code: 'en-IN', label: 'English IN', flag: '🇮🇳', script: 'English',   speaker: 'meera'    },
];

const getApiKey = () => process.env.EXPO_PUBLIC_SARVAM_API_KEY || '';

let currentSound: Audio.Sound | null = null;

/** Stop any currently playing audio */
export async function stopSarvamAudio(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
  }
}

/**
 * Speak text using Sarvam TTS.
 * Falls back to expo-speech if Sarvam is unavailable.
 */
export async function speakWithSarvam(
  text: string,
  languageCode: string,
  onStart?: () => void,
  onDone?: () => void,
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Fallback to expo-speech
    fallbackSpeak(text, onDone);
    return;
  }

  // Truncate to 500 chars (Sarvam limit per request)
  const input = text.slice(0, 500);
  const lang = SARVAM_LANGUAGES.find((l) => l.code === languageCode) || SARVAM_LANGUAGES[0];

  try {
    await stopSarvamAudio();
    onStart?.();

    const res = await fetch(SARVAM_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        inputs: [input],
        target_language_code: lang.code,
        speaker: lang.speaker,
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v1',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('Sarvam TTS error:', err);
      fallbackSpeak(text, onDone);
      return;
    }

    const data = await res.json();
    const base64Audio = data?.audios?.[0];
    if (!base64Audio) {
      fallbackSpeak(text, onDone);
      return;
    }

    // Play base64 WAV audio via expo-av
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${base64Audio}` },
      { shouldPlay: true }
    );
    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        currentSound = null;
        onDone?.();
      }
    });
  } catch (err) {
    console.warn('Sarvam TTS failed, using fallback:', err);
    fallbackSpeak(text, onDone);
  }
}

function fallbackSpeak(text: string, onDone?: () => void) {
  let Speech: any = null;
  try { Speech = require('expo-speech'); } catch {}
  if (Speech) {
    Speech.speak(text, { rate: 0.95, onDone, onError: onDone });
  } else {
    onDone?.();
  }
}

/**
 * Translate text to an Indian language using Sarvam Translate API.
 */
export async function translateWithSarvam(
  text: string,
  targetLanguageCode: string,
  sourceLanguageCode: string = 'en-IN',
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return text;

  try {
    const res = await fetch(TRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLanguageCode,
        target_language_code: targetLanguageCode,
        speaker_gender: 'Female',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: false,
      }),
    });

    if (!res.ok) return text;
    const data = await res.json();
    return data?.translated_text || text;
  } catch {
    return text;
  }
}
