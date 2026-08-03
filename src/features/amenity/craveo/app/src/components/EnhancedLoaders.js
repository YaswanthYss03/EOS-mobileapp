import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { colors, spacing, fontSize } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Enhanced App Loader with Hello Lottie Animation
const EnhancedAppLoader = ({ 
  text = 'Loading Craveo...', 
  subText = 'Preparing your delicious experience',
  showProgress = true 
}) => {
  return (
    <View style={styles.enhancedContainer}>
      <LinearGradient
        colors={['#f2f3f6ff', '#f6f6f6ff']}
        style={styles.gradientBackground}
      >
        <View style={styles.mainContent}>
          {/* Hello Lottie Animation */}
          <View style={styles.appLottieContainer}>
            <LottieView
              source={require('../../assets/Hello.json')}
              autoPlay
              loop
              style={styles.appLottieAnimation}
              resizeMode="contain"
            />
          </View>

          {/* Animated Text */}
          <Animatable.View
            animation="fadeInUp"
            delay={500}
            style={styles.textContainer}
          >
            <Text style={styles.mainText}>{text}</Text>
            <Text style={styles.subText}>{subText}</Text>
          </Animatable.View>

          {/* Progress Bar */}
          {showProgress && (
            <Animatable.View
              animation="fadeInUp"
              delay={800}
              style={styles.progressContainer}
            >
              <View style={styles.progressTrack}>
                <View style={styles.progressBar} />
              </View>
              <Text style={styles.progressText}>Loading...</Text>
            </Animatable.View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

// Enhanced Profile Loader with Avatars Multiple Lottie Animation
const EnhancedProfileLoader = ({ 
  size = 'large', 
  text = 'Loading your profile...', 
  style = {} 
}) => {
  return (
    <View style={[styles.profileContainer, style]}>
      {/* Avatars Multiple Lottie Animation */}
      <View style={styles.profileLottieContainer}>
        <LottieView
          source={require('../../assets/avatars multiple.json')}
          autoPlay
          loop
          style={styles.profileLottieAnimation}
          resizeMode="contain"
        />
      </View>

      {/* Loading Text */}
      <Animatable.Text
        animation="fadeInUp"
        delay={300}
        style={styles.profileLoadingText}
      >
        {text}
      </Animatable.Text>

      {/* Subtitle */}
      <Animatable.Text
        animation="fadeInUp"
        delay={500}
        style={styles.profileSubText}
      >
        Setting up your personalized experience...
      </Animatable.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  enhancedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLottieContainer: {
    width: width * 0.6,
    height: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  appLottieAnimation: {
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: spacing.xl,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mainText: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subText: {
    fontSize: fontSize.md,
    color: colors.black,
    textAlign: 'center',
    opacity: 0.8,
  },
  progressContainer: {
    width: width * 0.6,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(243, 105, 6, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 2,
    width: '70%',
  },
  progressText: {
    color: colors.white,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  floatingIcon: {
    position: 'absolute',
  },
  heartIcon: {
    top: -50,
    right: 30,
  },
  starIcon: {
    top: 20,
    left: -40,
  },
  plateIcon: {
    bottom: -30,
    right: -30,
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'transparent',
  },
  profileLottieContainer: {
    width: width * 0.7,
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profileLottieAnimation: {
    width: '100%',
    height: '100%',
  },
  waveRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    alignSelf: 'center',
  },
  profileIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotatingBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: colors.accent,
    borderRightColor: colors.accent,
  },
  profileLoadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontWeight: '500',
  },
  profileSubText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  ordersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  deliveryIcon: {
    marginBottom: spacing.xl,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deliveryGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  orderCardGradient: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  orderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orderDetails: {
    flex: 1,
  },
  shimmerLine: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  ordersLoadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginHorizontal: 4,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  simpleLoaderIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.3,
    alignSelf: 'center',
  },
  backgroundGradient: {
    flex: 1,
    borderRadius: 140,
  },
  steamParticle: {
    position: 'absolute',
    zIndex: 1,
  },
  dishConstellation: {
    position: 'relative',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dishItem: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginLeft: -25,
    marginTop: -25,
  },
  dishGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chefHatContainer: {
    position: 'absolute',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    zIndex: 10,
  },
  chefHatGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chefHatShadow: {
    position: 'absolute',
    bottom: -5,
    width: 120,
    height: 20,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: -1,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 5,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.xl * 2,
  },
  menuLoadingText: {
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  menuSubText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressDots: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  cartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  cartIcon: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: spacing.xl,
  },
  cartGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItem: {
    position: 'absolute',
    top: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cartLoadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontWeight: '500',
  },
  
  // QR Scanner Loader Styles
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  qrLottieContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrLottieAnimation: {
    width: width * 0.7,
    height: height * 0.2,
  },
  qrTextContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  qrLoadingText: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  qrSubText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
});

// Enhanced Orders Loader
const EnhancedOrdersLoader = ({ 
  size = 'large', 
  text = 'Loading your orders...', 
  style = {} 
}) => {
  const slideAnims = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(-100))
  ).current;
  const fadeAnims = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0))
  ).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered slide in animations for order cards
    const slideAnimations = slideAnims.map((anim, index) => {
      return Animated.sequence([
        Animated.delay(index * 200),
        Animated.parallel([
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnims[index], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Floating animation for delivery icon
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    slideAnimations.forEach(anim => anim.start());
    floatAnimation.start();

    return () => {
      slideAnimations.forEach(anim => anim.stop());
      floatAnimation.stop();
    };
  }, [slideAnims, fadeAnims, floatAnim]);

  const getCardSize = () => {
    switch (size) {
      case 'small': return { width: 200, height: 60 };
      case 'medium': return { width: 250, height: 80 };
      case 'large': return { width: 300, height: 100 };
      default: return { width: 300, height: 100 };
    }
  };

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={[styles.ordersContainer, style]}>
      {/* Floating Delivery Icon */}
      <Animated.View
        style={[
          styles.deliveryIcon,
          {
            transform: [{ translateY: floatY }],
          },
        ]}
      >
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.deliveryGradient}
        >
          <MaterialCommunityIcons
            name="motorbike"
            size={40}
            color={colors.white}
          />
        </LinearGradient>
      </Animated.View>

      {/* Animated Order Cards */}
      {slideAnims.map((slideAnim, index) => {
        const cardSize = getCardSize();
        return (
          <Animated.View
            key={index}
            style={[
              styles.orderCard,
              cardSize,
              {
                opacity: fadeAnims[index],
                transform: [{ translateX: slideAnim }],
                marginBottom: index < slideAnims.length - 1 ? spacing.sm : 0,
              },
            ]}
          >
            <LinearGradient
              colors={
                index === 0 
                  ? ['#ff9a9e', '#fecfef']
                  : index === 1
                  ? ['#a8edea', '#fed6e3']
                  : ['#ffecd2', '#fcb69f']
              }
              style={styles.orderCardGradient}
            >
              <View style={styles.orderContent}>
                <View style={styles.orderIcon}>
                  <MaterialCommunityIcons
                    name={
                      index === 0 
                        ? "clock-outline"
                        : index === 1
                        ? "chef-hat"
                        : "check-circle"
                    }
                    size={24}
                    color={colors.white}
                  />
                </View>
                <View style={styles.orderDetails}>
                  <View style={styles.shimmerLine} />
                  <View style={[styles.shimmerLine, { width: '60%' }]} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        );
      })}

      {/* Loading Text */}
      <Animatable.Text
        animation="fadeInUp"
        delay={800}
        style={styles.ordersLoadingText}
      >
        {text}
      </Animatable.Text>

      {/* Animated Dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animatable.View
            key={index}
            animation="bounce"
            iterationCount="infinite"
            delay={index * 200}
            style={styles.dot}
          />
        ))}
      </View>
    </View>
  );
};

// Enhanced Menu Loader with a simple pulsing icon
const EnhancedMenuLoader = ({
  size = 'large', 
  text = 'Loading delicious menu...', 
  style = {} 
}) => {
  return (
    <View style={[styles.menuContainer, style]}>
      {/* Simple pulsing icon, replacing the old dancing-chef Lottie */}
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1400}
        style={styles.simpleLoaderIcon}
      >
        <MaterialCommunityIcons name="silverware-fork-knife" size={40} color={colors.primary} />
      </Animatable.View>

      {/* Animated Loading Text */}
      <Animatable.View
        animation="fadeInUp"
        delay={500}
        style={[styles.textContainer, { marginTop: spacing.md }]}
      >
        <Text style={styles.menuLoadingText}>{text}</Text>
        <Text style={styles.menuSubText}>Just a moment while we get things ready...</Text>
      </Animatable.View>

      {/* Animated Progress Dots */}
      <View style={[styles.progressDots, { marginTop: spacing.md }]}>
        {[0, 1, 2, 3, 4].map((index) => (
          <Animatable.View
            key={index}
            animation="pulse"
            iterationCount="infinite"
            delay={index * 200}
            style={[styles.progressDot, { backgroundColor: colors.primary }]}
          />
        ))}
      </View>
    </View>
  );
};

// Enhanced Cart Loader
const EnhancedCartLoader = ({ 
  size = 'large', 
  text = 'Adding to cart...', 
  style = {} 
}) => {
  const cartAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(
    Array.from({ length: 3 }, () => ({
      drop: new Animated.Value(-50),
      fade: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Cart shake animation
    const cartAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cartAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(cartAnim, {
          toValue: -1,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(cartAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    );

    // Items dropping into cart animation
    const itemAnimations = itemAnims.map((item, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 500),
          Animated.parallel([
            Animated.timing(item.drop, {
              toValue: 0,
              duration: 800,
              easing: Easing.bounce,
              useNativeDriver: true,
            }),
            Animated.timing(item.fade, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(1000),
          Animated.parallel([
            Animated.timing(item.drop, {
              toValue: -50,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(item.fade, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    cartAnimation.start();
    itemAnimations.forEach(anim => anim.start());

    return () => {
      cartAnimation.stop();
      itemAnimations.forEach(anim => anim.stop());
    };
  }, [cartAnim, itemAnims]);

  const cartShake = cartAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <View style={[styles.cartContainer, style]}>
      {/* Animated Cart */}
      <Animated.View
        style={[
          styles.cartIcon,
          {
            transform: [{ rotate: cartShake }],
          },
        ]}
      >
        <LinearGradient
          colors={['#4ecdc4', '#44a08d']}
          style={styles.cartGradient}
        >
          <MaterialCommunityIcons
            name="cart"
            size={60}
            color={colors.white}
          />
        </LinearGradient>
      </Animated.View>

      {/* Dropping Items */}
      {itemAnims.map((item, index) => {
        const itemIcons = ['food-apple', 'food-croissant', 'coffee'];
        return (
          <Animated.View
            key={index}
            style={[
              styles.cartItem,
              {
                right: 20 + (index * 15),
                opacity: item.fade,
                transform: [{ translateY: item.drop }],
              },
            ]}
          >
            <MaterialCommunityIcons
              name={itemIcons[index]}
              size={25}
              color={colors.primary}
            />
          </Animated.View>
        );
      })}

      {/* Loading Text */}
      <Animatable.Text
        animation="fadeInUp"
        delay={300}
        iterationCount="infinite"
        style={styles.cartLoadingText}
      >
        {text}
      </Animatable.Text>
    </View>
  );
};

// Enhanced QR Scanner Loader with QR Scan Lottie Animation
const EnhancedQRLoader = ({ 
  text = 'Processing QR code...', 
  subText = 'Analyzing the scanned code',
  size = 'medium'
}) => {
  const containerHeight = size === 'small' ? height * 0.15 : height * 0.25;
  const lottieSize = size === 'small' ? 0.5 : 0.7;

  return (
    <View style={[styles.qrContainer, { height: containerHeight }]}>
      {/* QR Scan Lottie Animation */}
      <View style={styles.qrLottieContainer}>
        <LottieView
          source={require('../../assets/QR Scan.json')}
          autoPlay
          loop
          style={[styles.qrLottieAnimation, { 
            width: width * lottieSize, 
            height: height * 0.2 
          }]}
          resizeMode="contain"
        />
      </View>

      {/* Animated Text */}
      <Animatable.View
        animation="fadeInUp"
        delay={300}
        style={styles.qrTextContainer}
      >
        <Text style={styles.qrLoadingText}>{text}</Text>
        {subText && (
          <Animatable.Text
            animation="fadeInUp"
            delay={500}
            style={styles.qrSubText}
          >
            {subText}
          </Animatable.Text>
        )}
      </Animatable.View>
    </View>
  );
};

export { EnhancedAppLoader, EnhancedProfileLoader, EnhancedOrdersLoader, EnhancedMenuLoader, EnhancedCartLoader, EnhancedQRLoader };