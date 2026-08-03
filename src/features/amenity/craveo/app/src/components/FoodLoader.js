import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../constants/theme';

const FoodLoader = ({ 
  size = 'large', 
  text = 'Preparing your delicious meal...', 
  style = {},
  type = 'cooking' // 'cooking', 'pizza', 'burger', 'coffee'
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Main rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Bounce animation for secondary elements
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Scale pulse animation
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Opacity breathing animation
    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    rotateAnimation.start();
    bounceAnimation.start();
    scaleAnimation.start();
    opacityAnimation.start();

    return () => {
      rotateAnimation.stop();
      bounceAnimation.stop();
      scaleAnimation.stop();
      opacityAnimation.stop();
    };
  }, [rotateAnim, bounceAnim, scaleAnim, opacityAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bounce = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const getIconSize = () => {
    switch (size) {
      case 'small': return 24;
      case 'medium': return 36;
      case 'large': return 48;
      case 'xlarge': return 64;
      default: return 48;
    }
  };

  const getSecondaryIconSize = () => {
    return getIconSize() * 0.6;
  };

  const renderCookingLoader = () => (
    <View style={styles.loaderContainer}>
      {/* Main cooking pot with rotation */}
      <Animated.View
        style={[
          styles.mainIcon,
          {
            transform: [
              { rotate: spin },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="pot-steam" 
          size={getIconSize()} 
          color={colors.primary} 
        />
      </Animated.View>

      {/* Floating food items */}
      <Animated.View
        style={[
          styles.floatingIcon,
          styles.topLeft,
          {
            transform: [{ translateY: bounce }],
            opacity: opacityAnim,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="carrot" 
          size={getSecondaryIconSize()} 
          color={colors.success} 
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingIcon,
          styles.topRight,
          {
            transform: [{ translateY: bounce }],
            opacity: opacityAnim,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="fish" 
          size={getSecondaryIconSize()} 
          color={colors.info} 
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingIcon,
          styles.bottomLeft,
          {
            transform: [{ translateY: bounce }],
            opacity: opacityAnim,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="mushroom" 
          size={getSecondaryIconSize()} 
          color={colors.warning} 
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingIcon,
          styles.bottomRight,
          {
            transform: [{ translateY: bounce }],
            opacity: opacityAnim,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="corn" 
          size={getSecondaryIconSize()} 
          color={colors.secondary} 
        />
      </Animated.View>
    </View>
  );

  const renderPizzaLoader = () => (
    <View style={styles.loaderContainer}>
      <Animated.View
        style={[
          styles.mainIcon,
          {
            transform: [{ rotate: spin }]
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="pizza" 
          size={getIconSize()} 
          color={colors.primary} 
        />
      </Animated.View>

      {/* Pizza toppings bouncing around */}
      <Animated.View
        style={[
          styles.floatingIcon,
          styles.topCenter,
          {
            transform: [{ translateY: bounce }],
            opacity: opacityAnim,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="circle" 
          size={getSecondaryIconSize() * 0.5} 
          color={colors.error} 
        />
      </Animated.View>
    </View>
  );

  const renderBurgerLoader = () => (
    <View style={styles.loaderContainer}>
      {/* Burger layers stacking animation */}
      <Animated.View
        style={[
          styles.mainIcon,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="hamburger" 
          size={getIconSize()} 
          color={colors.primary} 
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingIcon,
          styles.center,
          {
            transform: [{ translateY: bounce }],
            opacity: opacityAnim,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="leaf" 
          size={getSecondaryIconSize()} 
          color={colors.success} 
        />
      </Animated.View>
    </View>
  );

  const renderCoffeeLoader = () => (
    <View style={styles.loaderContainer}>
      <Animated.View
        style={[
          styles.mainIcon,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="coffee" 
          size={getIconSize()} 
          color={colors.primary} 
        />
      </Animated.View>

      {/* Steam effect */}
      <Animated.View
        style={[
          styles.floatingIcon,
          styles.topCenter,
          {
            transform: [
              { translateY: bounce },
              { rotate: spin }
            ],
            opacity: opacityAnim,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="weather-fog" 
          size={getSecondaryIconSize()} 
          color={colors.textSecondary} 
        />
      </Animated.View>
    </View>
  );

  const renderLoader = () => {
    switch (type) {
      case 'pizza': return renderPizzaLoader();
      case 'burger': return renderBurgerLoader();
      case 'coffee': return renderCoffeeLoader();
      default: return renderCookingLoader();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderLoader()}
      {text && (
        <Animated.View style={{ opacity: opacityAnim }}>
          <Text style={styles.loadingText}>{text}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loaderContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  mainIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingIcon: {
    position: 'absolute',
  },
  topLeft: {
    top: 10,
    left: 10,
  },
  topRight: {
    top: 10,
    right: 10,
  },
  topCenter: {
    top: 5,
    alignSelf: 'center',
  },
  bottomLeft: {
    bottom: 10,
    left: 10,
  },
  bottomRight: {
    bottom: 10,
    right: 10,
  },
  center: {
    alignSelf: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export default FoodLoader;
