import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { colors, spacing, fontSize } from '../constants/theme';
import { fonts } from '../../../../../../theme';

const ProfileLoader = ({ 
  size = 'large', 
  text = 'Loading your profile...', 
  style = {} 
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Profile icon rotation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Scale animation for profile
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

    // Pulse animation for background
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    rotateAnimation.start();
    scaleAnimation.start();
    pulseAnimation.start();

    return () => {
      rotateAnimation.stop();
      scaleAnimation.stop();
      pulseAnimation.stop();
    };
  }, [rotateAnim, scaleAnim, pulseAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getIconSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'medium': return 48;
      case 'large': return 64;
      case 'xlarge': return 80;
      default: return 64;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.profileContainer}>
        {/* Animated background circle */}
        <Animated.View
          style={[
            styles.backgroundCircle,
            {
              opacity: pulseAnim,
              transform: [{ scale: scaleAnim }],
              width: getIconSize() * 2,
              height: getIconSize() * 2,
              borderRadius: getIconSize(),
            }
          ]}
        />

        {/* Main profile icon */}
        <Animated.View
          style={[
            styles.profileIcon,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="account-circle" 
            size={getIconSize()} 
            color={colors.primary} 
          />
        </Animated.View>

        {/* Floating user-related icons */}
        <Animated.View
          style={[
            styles.floatingIcon,
            styles.settingsIcon,
            {
              transform: [{ rotate: spin }],
              opacity: pulseAnim,
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="cog" 
            size={getIconSize() * 0.3} 
            color={colors.secondary} 
          />
        </Animated.View>

        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={2000}
          style={[styles.floatingIcon, styles.heartIcon]}
        >
          <MaterialCommunityIcons 
            name="heart-outline" 
            size={getIconSize() * 0.25} 
            color={colors.error} 
          />
        </Animatable.View>

        <Animatable.View
          animation="bounce"
          iterationCount="infinite"
          duration={2500}
          style={[styles.floatingIcon, styles.starIcon]}
        >
          <MaterialCommunityIcons 
            name="star-outline" 
            size={getIconSize() * 0.25} 
            color={colors.warning} 
          />
        </Animatable.View>

        <Animatable.View
          animation={{
            0: { opacity: 0.3, scale: 1 },
            0.5: { opacity: 1, scale: 1.1 },
            1: { opacity: 0.3, scale: 1 },
          }}
          iterationCount="infinite"
          duration={1800}
          style={[styles.floatingIcon, styles.badgeIcon]}
        >
          <MaterialCommunityIcons 
            name="account-check" 
            size={getIconSize() * 0.25} 
            color={colors.success} 
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

const OrdersLoader = ({ 
  size = 'large', 
  text = 'Loading your orders...', 
  style = {} 
}) => {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const plateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Delivery person movement animation
    const moveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Scale animation for orders
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Plate rotation animation
    const plateAnimation = Animated.loop(
      Animated.timing(plateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    moveAnimation.start();
    scaleAnimation.start();
    plateAnimation.start();

    return () => {
      moveAnimation.stop();
      scaleAnimation.stop();
      plateAnimation.stop();
    };
  }, [moveAnim, scaleAnim, plateAnim]);

  const moveTranslateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  const plateRotation = plateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getIconSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'medium': return 48;
      case 'large': return 64;
      case 'xlarge': return 80;
      default: return 64;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.ordersContainer}>
        {/* Central order list icon */}
        <Animated.View
          style={[
            styles.orderListIcon,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="clipboard-list" 
            size={getIconSize()} 
            color={colors.primary} 
          />
        </Animated.View>

        {/* Moving delivery person */}
        <Animated.View
          style={[
            styles.deliveryPerson,
            {
              transform: [{ translateX: moveTranslateX }, { scale: scaleAnim }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="motorbike" 
            size={getIconSize() * 0.6} 
            color={colors.success} 
          />
        </Animated.View>

        {/* Rotating food plates */}
        <Animated.View
          style={[
            styles.floatingPlate,
            styles.plate1,
            {
              transform: [{ rotate: plateRotation }, { scale: scaleAnim }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="food" 
            size={getIconSize() * 0.3} 
            color={colors.warning} 
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.floatingPlate,
            styles.plate2,
            {
              transform: [{ rotate: plateRotation }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="bowl-mix-outline" 
            size={getIconSize() * 0.25} 
            color={colors.info} 
          />
        </Animated.View>

        {/* Order status indicators */}
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={1500}
          style={[styles.statusIndicator, styles.status1]}
        >
          <MaterialCommunityIcons 
            name="clock-outline" 
            size={getIconSize() * 0.2} 
            color={colors.textSecondary} 
          />
        </Animatable.View>

        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={1800}
          style={[styles.statusIndicator, styles.status2]}
        >
          <MaterialCommunityIcons 
            name="check-circle" 
            size={getIconSize() * 0.2} 
            color={colors.success} 
          />
        </Animatable.View>

        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={2100}
          style={[styles.statusIndicator, styles.status3]}
        >
          <MaterialCommunityIcons 
            name="truck-delivery" 
            size={getIconSize() * 0.2} 
            color={colors.primary} 
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  profileContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  ordersContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  backgroundCircle: {
    position: 'absolute',
    backgroundColor: colors.primary + '20',
  },
  profileIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  orderListIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  floatingIcon: {
    position: 'absolute',
  },
  settingsIcon: {
    top: 20,
    right: 20,
  },
  heartIcon: {
    top: 30,
    left: 15,
  },
  starIcon: {
    bottom: 30,
    right: 15,
  },
  badgeIcon: {
    bottom: 20,
    left: 20,
  },
  deliveryPerson: {
    position: 'absolute',
    top: 20,
  },
  floatingPlate: {
    position: 'absolute',
  },
  plate1: {
    top: 40,
    right: 20,
  },
  plate2: {
    bottom: 40,
    left: 20,
  },
  statusIndicator: {
    position: 'absolute',
  },
  status1: {
    top: 60,
    left: 30,
  },
  status2: {
    bottom: 60,
    right: 30,
  },
  status3: {
    bottom: 30,
    alignSelf: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
    fontFamily: fonts.medium,
  },
});

export { ProfileLoader, OrdersLoader };
