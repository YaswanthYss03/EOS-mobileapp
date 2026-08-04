import { DefaultTheme } from 'react-native-paper';
// Inter is loaded once at the EOS root layout (app/_layout.tsx) via
// @expo-google-fonts/inter, so its family names are available here too.
import { fonts } from '../../../../../../theme';

// Simple colors object for easy access
// Palette derived from assets/logo.png (Sri Eshwar College crest) - see constants/theme.js
export const colors = {
  primary: '#235EAA',
  accent: '#F9C205',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  text: '#1a1a1a',
  placeholder: '#8e8e93',
  error: '#ff3b30',
  success: '#34c759',
  warning: '#ff9500',
  secondary: '#f2f2f7',
  tertiary: '#ffffff',
  border: '#e1e1e1',
  disabled: '#B7CBE6',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    placeholder: colors.placeholder,
    error: colors.error,
    disabled: colors.disabled,
    backdrop: colors.backdrop,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: { fontFamily: fonts.regular, fontWeight: 'normal' },
    medium: { fontFamily: fonts.medium, fontWeight: '500' },
    light: { fontFamily: fonts.regular, fontWeight: 'normal' },
    thin: { fontFamily: fonts.regular, fontWeight: 'normal' },
  },
  spacing,
  // Custom theme extensions
  custom: {
    colors,
    spacing,
  }
};
