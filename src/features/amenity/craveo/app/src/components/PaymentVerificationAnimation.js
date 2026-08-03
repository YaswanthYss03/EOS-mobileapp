import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors, fontSize, spacing } from '../constants/theme';

const PaymentVerificationAnimation = ({ 
  size = 120, 
  autoPlay = true, 
  loop = true,
  style = {},
  showScanningText = false,
  scanningText = "Scanning..."
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LottieView
        source={require('../../assets/paymentverification.json')}
        style={styles.animation}
        autoPlay={autoPlay}
        loop={loop}
        speed={1.0}
        resizeMode="contain"
      />
      {showScanningText && (
        <Text style={styles.scanningText}>{scanningText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  scanningText: {
    position: 'absolute',
    bottom: -25,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default PaymentVerificationAnimation;