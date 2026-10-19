import { fontFamily } from './fonts';
import { colors } from './colors';
import type { TextStyle } from 'react-native';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const typography = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 48,
    color: colors.textPrimary,
  } as TextStyle,

  h1: {
    fontFamily: fontFamily.h1,
    fontSize: 28,
    lineHeight: 36,
    color: colors.textPrimary,
  } as TextStyle,

  h2: {
    fontFamily: fontFamily.h2,
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
  } as TextStyle,

  h3: {
    fontFamily: fontFamily.h3,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
  } as TextStyle,

  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  } as TextStyle,

  bodySecondary: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  } as TextStyle,

  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  } as TextStyle,

  amountLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 34,
    lineHeight: 40,
    color: colors.textPrimary,
    fontVariant: tabular,
  } as TextStyle,

  amount: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontVariant: tabular,
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;