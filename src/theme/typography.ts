import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  } as TextStyle,
  h2: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  } as TextStyle,
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  } as TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
  small: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.3,
  } as TextStyle,
  chat: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
  } as TextStyle,
} as const;
