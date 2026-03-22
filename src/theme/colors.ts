export const colors = {
  // True black base — Gen Z dark
  bg: '#000000',
  bgCard: '#0D0D0D',
  bgElevated: '#1A1A1A',
  bgInput: '#111111',

  // Primary electric purple + hot pink accent
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  primaryLight: '#C084FC',
  accent: '#EC4899',
  accentSoft: '#EC489915',

  // Gradients — purple → pink
  gradientStart: '#A855F7',
  gradientEnd: '#EC4899',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#505060',
  textLink: '#06B6D4',

  // Status
  online: '#A855F7',
  error: '#FF4444',
  warning: '#FFD600',

  // Chat bubbles
  bubbleUser: '#3B1D6E',
  bubbleUserDark: '#2D1654',
  bubbleAI: '#1A1A1A',
  bubbleAIDark: '#111111',

  // Chat background
  chatBg: '#000000',
  chatPattern: '#0D0D0D',

  // Borders
  border: '#1F1F1F',
  borderLight: '#2A2A2A',

  // Unread badge
  badge: '#A855F7',

  // Character accent colors (vibrant for group chats)
  characterColors: [
    '#FF6B6B', // Coral red
    '#FFD93D', // Sunny yellow
    '#6BCB77', // Fresh green
    '#4D96FF', // Sky blue
    '#FF6BD6', // Hot pink
    '#A855F7', // Purple
    '#FF922B', // Orange
    '#20C997', // Teal
    '#F06595', // Rose
    '#06B6D4', // Cyan
  ] as const,
} as const;

export type Colors = typeof colors;
