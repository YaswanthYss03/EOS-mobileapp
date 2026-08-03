import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { theme } from '../constants/theme';

export const AnimatedView = ({ children, animation = 'fadeInUp', duration = 600, delay = 0, style, ...props }) => {
  return (
    <Animatable.View
      animation={animation}
      duration={duration}
      delay={delay}
      style={[styles.container, style]}
      {...props}
    >
      {children}
    </Animatable.View>
  );
};

export const PremiumCard = ({ children, style, onPress, disabled = false, elevation = 2 }) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <AnimatedView animation="fadeInUp" duration={500}>
      <CardComponent
        style={[
          styles.premiumCard,
          { elevation },
          disabled && styles.disabled,
          style
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.95}
      >
        {children}
      </CardComponent>
    </AnimatedView>
  );
};

export const PremiumButton = ({ children, onPress, style, variant = 'primary', size = 'medium', disabled = false }) => {
  return (
    <AnimatedView animation="bounceIn" duration={800}>
      <TouchableOpacity
        style={[
          styles.button,
          styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
          styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
          disabled && styles.buttonDisabled,
          style
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  premiumCard: {
    backgroundColor: theme.colors.tertiary,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.secondary,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonSmall: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  buttonMedium: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  buttonLarge: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
});
