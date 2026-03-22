// Coin reward amounts
export const COIN_REWARDS = {
  MESSAGE_SENT: 2,       // per message
  DAILY_LOGIN: 20,       // first open of the day
  STREAK_3:  30,
  STREAK_7:  100,
  STREAK_14: 200,
  STREAK_30: 500,
  STREAK_60: 1000,
  STREAK_100: 2500,
} as const;

// Coin costs for spending
export const COIN_COSTS = {
  UNLOCK_PREMIUM_CHAR: 500,
  CHAT_WALLPAPER: 200,
  CUSTOM_BUBBLE: 150,
  STREAK_FREEZE: 100,
} as const;

export function getStreakBonus(streak: number): number {
  if (streak >= 100) return COIN_REWARDS.STREAK_100;
  if (streak >= 60)  return COIN_REWARDS.STREAK_60;
  if (streak >= 30)  return COIN_REWARDS.STREAK_30;
  if (streak >= 14)  return COIN_REWARDS.STREAK_14;
  if (streak >= 7)   return COIN_REWARDS.STREAK_7;
  if (streak >= 3)   return COIN_REWARDS.STREAK_3;
  return 0;
}

export function formatCoins(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
