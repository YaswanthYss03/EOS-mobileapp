import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const AlarmModal = ({ visible, alarmData, onAcknowledge, onSnooze, onDismiss }) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(height));

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for the icon
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!alarmData) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
      
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header with pulsing icon */}
          <View style={styles.header}>
            <Animated.View 
              style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Ionicons name="restaurant" size={50} color="#fff" />
            </Animated.View>
            <Text style={styles.title}>🍽️ Your Food is Ready!</Text>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{alarmData.message}</Text>
            <Text style={styles.subtitle}>
              ⏰ Please collect your food from the canteen
            </Text>
            <Text style={styles.warning}>
              🔔 This alert will repeat if not acknowledged
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.acknowledgeButton]}
              onPress={onAcknowledge}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>I'm Coming!</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.snoozeButton]}
              onPress={onSnooze}
              activeOpacity={0.8}
            >
              <Ionicons name="time" size={24} color="#fff" />
              <Text style={styles.buttonText}>Snooze 5min</Text>
            </TouchableOpacity>
          </View>

          {/* Progress bar showing urgency */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar} />
            <Text style={styles.urgencyText}>HIGH PRIORITY</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 30,
    minHeight: height * 0.4,
    borderTopWidth: 3,
    borderTopColor: '#ff4444',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    backgroundColor: '#ff4444',
    borderRadius: 50,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  message: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffaa44',
    textAlign: 'center',
    marginBottom: 8,
  },
  warning: {
    fontSize: 14,
    color: '#ff8888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  acknowledgeButton: {
    backgroundColor: '#22c55e',
  },
  snoozeButton: {
    backgroundColor: '#f59e0b',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  urgencyText: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

export default AlarmModal;
