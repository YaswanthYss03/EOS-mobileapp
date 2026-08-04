import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../../../../../theme';

const SimpleToast = ({ visible, message, type = 'success', onHide }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#34c759';
      case 'error':
        return '#ff3b30';
      case 'warning':
        return '#ff9500';
      default:
        return '#235EAA';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
});

export default SimpleToast;
