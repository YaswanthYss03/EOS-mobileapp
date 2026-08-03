import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { colors, spacing, fontSize } from '../constants/theme';

const ChefLoader = ({ 
  size = 'large', 
  text = 'Chef is preparing your order...', 
  style = {} 
}) => {
  const cookingAnim = useRef(new Animated.Value(0)).current;
  const steamAnim = useRef(new Animated.Value(0)).current;
  const panAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Chef cooking animation
    const cookingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cookingAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(cookingAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Steam animation
    const steamAnimation = Animated.loop(
      Animated.timing(steamAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );

    // Pan shaking animation
    const panAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(panAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(panAnim, {
          toValue: -1,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(panAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    cookingAnimation.start();
    steamAnimation.start();
    panAnimation.start();

    return () => {
      cookingAnimation.stop();
      steamAnimation.stop();
      panAnimation.stop();
    };
  }, [cookingAnim, steamAnim, panAnim]);

  const chefScale = cookingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const steamOpacity = steamAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const steamTranslateY = steamAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const panRotate = panAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const getIconSize = () => {
    switch (size) {
      case 'small': return 28;
      case 'medium': return 40;
      case 'large': return 56;
      case 'xlarge': return 72;
      default: return 56;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.chefContainer}>
        {/* Chef Hat with bouncing animation */}
        <Animatable.View
          animation="bounce"
          iterationCount="infinite"
          duration={2000}
          style={styles.hatContainer}
        >
          <MaterialCommunityIcons 
            name="chef-hat" 
            size={getIconSize() * 0.8} 
            color={colors.surface} 
            style={styles.shadow}
          />
        </Animatable.View>

        {/* Chef face */}
        <Animated.View
          style={[
            styles.chefFace,
            {
              transform: [{ scale: chefScale }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="account-circle" 
            size={getIconSize()} 
            color={colors.primary} 
          />
        </Animated.View>

        {/* Cooking pan */}
        <Animated.View
          style={[
            styles.panContainer,
            {
              transform: [{ rotate: panRotate }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="frying-pan" 
            size={getIconSize() * 0.9} 
            color={colors.textSecondary} 
          />
        </Animated.View>

        {/* Steam effects */}
        <Animated.View
          style={[
            styles.steamContainer,
            {
              opacity: steamOpacity,
              transform: [{ translateY: steamTranslateY }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="weather-fog" 
            size={getIconSize() * 0.4} 
            color={colors.info} 
            style={styles.steam1}
          />
          <MaterialCommunityIcons 
            name="weather-fog" 
            size={getIconSize() * 0.3} 
            color={colors.info} 
            style={styles.steam2}
          />
          <MaterialCommunityIcons 
            name="weather-fog" 
            size={getIconSize() * 0.2} 
            color={colors.info} 
            style={styles.steam3}
          />
        </Animated.View>

        {/* Floating ingredients */}
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={1500}
          style={[styles.ingredient, styles.ingredient1]}
        >
          <MaterialCommunityIcons 
            name="chili-mild" 
            size={getIconSize() * 0.3} 
            color={colors.error} 
          />
        </Animatable.View>

        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={1800}
          style={[styles.ingredient, styles.ingredient2]}
        >
          <MaterialCommunityIcons 
            name="leaf" 
            size={getIconSize() * 0.3} 
            color={colors.success} 
          />
        </Animatable.View>

        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={2100}
          style={[styles.ingredient, styles.ingredient3]}
        >
          <MaterialCommunityIcons 
            name="pasta" 
            size={getIconSize() * 0.3} 
            color={colors.warning} 
          />
        </Animatable.View>
      </View>

      {text && (
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={2000}
        >
          <Text style={styles.loadingText}>{text}</Text>
        </Animatable.View>
      )}
    </View>
  );
};

const PizzaOvenLoader = ({ 
  size = 'large', 
  text = 'Baking your pizza to perfection...', 
  style = {} 
}) => {
  const ovenAnim = useRef(new Animated.Value(0)).current;
  const pizzaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Oven heat animation
    const ovenAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ovenAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ovenAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Pizza spinning animation
    const pizzaAnimation = Animated.loop(
      Animated.timing(pizzaAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    ovenAnimation.start();
    pizzaAnimation.start();

    return () => {
      ovenAnimation.stop();
      pizzaAnimation.stop();
    };
  }, [ovenAnim, pizzaAnim]);

  const ovenGlow = ovenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const pizzaRotation = pizzaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getIconSize = () => {
    switch (size) {
      case 'small': return 28;
      case 'medium': return 40;
      case 'large': return 56;
      case 'xlarge': return 72;
      default: return 56;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.ovenContainer}>
        {/* Oven */}
        <Animated.View
          style={[
            styles.oven,
            {
              opacity: ovenGlow,
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="stove" 
            size={getIconSize() * 1.2} 
            color={colors.warning} 
          />
        </Animated.View>

        {/* Pizza spinning inside */}
        <Animated.View
          style={[
            styles.pizzaInOven,
            {
              transform: [{ rotate: pizzaRotation }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="pizza" 
            size={getIconSize() * 0.6} 
            color={colors.primary} 
          />
        </Animated.View>

        {/* Heat waves */}
        <Animatable.View
          animation={{
            0: { opacity: 0.2, translateY: 0 },
            0.5: { opacity: 1, translateY: -5 },
            1: { opacity: 0.2, translateY: 0 },
          }}
          iterationCount="infinite"
          duration={1000}
          style={[styles.heatWave, styles.heatWave1]}
        >
          <Text style={styles.heatText}>〜</Text>
        </Animatable.View>

        <Animatable.View
          animation={{
            0: { opacity: 0.1, translateY: 0 },
            0.5: { opacity: 0.8, translateY: -3 },
            1: { opacity: 0.1, translateY: 0 },
          }}
          iterationCount="infinite"
          duration={1200}
          style={[styles.heatWave, styles.heatWave2]}
        >
          <Text style={styles.heatText}>〜</Text>
        </Animatable.View>

        <Animatable.View
          animation={{
            0: { opacity: 0.3, translateY: 0 },
            0.5: { opacity: 0.9, translateY: -4 },
            1: { opacity: 0.3, translateY: 0 },
          }}
          iterationCount="infinite"
          duration={1400}
          style={[styles.heatWave, styles.heatWave3]}
        >
          <Text style={styles.heatText}>〜</Text>
        </Animatable.View>
      </View>

      {text && (
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={2000}
        >
          <Text style={styles.loadingText}>{text}</Text>
        </Animatable.View>
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
  chefContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  ovenContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  hatContainer: {
    position: 'absolute',
    top: 10,
    zIndex: 3,
  },
  chefFace: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  panContainer: {
    position: 'absolute',
    bottom: 20,
    zIndex: 1,
  },
  steamContainer: {
    position: 'absolute',
    top: 40,
    alignItems: 'center',
    zIndex: 4,
  },
  steam1: {
    marginBottom: -5,
  },
  steam2: {
    marginLeft: 10,
    marginBottom: -3,
  },
  steam3: {
    marginLeft: -8,
  },
  ingredient: {
    position: 'absolute',
  },
  ingredient1: {
    top: 20,
    right: 20,
  },
  ingredient2: {
    bottom: 30,
    left: 15,
  },
  ingredient3: {
    top: 50,
    left: 20,
  },
  oven: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pizzaInOven: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatWave: {
    position: 'absolute',
  },
  heatWave1: {
    top: 20,
    left: 30,
  },
  heatWave2: {
    top: 25,
    right: 35,
  },
  heatWave3: {
    top: 30,
    alignSelf: 'center',
  },
  heatText: {
    fontSize: 20,
    color: colors.warning,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  shadow: {
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export { ChefLoader, PizzaOvenLoader };
