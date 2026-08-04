import { DefaultTheme } from 'react-native-paper';
// Inter is loaded once at the EOS root layout (app/_layout.tsx) via
// @expo-google-fonts/inter, so its family names are available here too.
import { fonts } from '../../../../../../theme';

// Palette derived from assets/logo.png (Sri Eshwar College crest) - blue shield +
// gold torch flame - replacing the old orange/red Craveo brand colors.
export const colors = {
  primary: '#235EAA',
  primaryLight: '#5B8FD1',
  primaryDark: '#173F73',
  accent: '#F9C205',
  background: '#FFFFFF',
  surface: '#ffffffff',
  text: '#2d3436',
  textSecondary: '#636e72',
  placeholder: '#636e72',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  onSurface: '#2d3436',
  disabled: '#ddd6fe',
  error: '#e17055',
  success: '#00b894',
  warning: '#fdcb6e',
  info: '#74b9ff',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#636e72',
  lightGray: '#f5f6fa',
  border: '#ceccd5ff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colors,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: fonts.regular,
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: fonts.medium,
      fontWeight: '500',
    },
    // No light/thin Inter weight is loaded, so both fall back to regular
    // rather than silently reverting to the system font.
    light: {
      fontFamily: fonts.regular,
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: fonts.regular,
      fontWeight: 'normal',
    },
  },
  spacing,
  fontSize,
  borderRadius,
};
