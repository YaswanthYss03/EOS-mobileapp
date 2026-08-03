import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Portal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');

const USER_TYPES = [
  { 
    id: 1, 
    label: 'Day Scholar', 
    value: 'day-scholar',
    icon: 'school-outline',
    description: 'Students & Faculties who commute daily',
    gradient: ['#4F46E5', '#7C3AED'],
    color: '#4F46E5'
  },
  { 
    id: 2, 
    label: 'Boys Hosteller', 
    value: 'boys-hosteller',
    icon: 'home-group',
    description: 'Male students in hostel',
    gradient: ['#059669', '#0891B2'],
    color: '#059669'
  },
  { 
    id: 3, 
    label: 'Girls Hosteller', 
    value: 'girls-hosteller',
    icon: 'home-heart',
    description: 'Female students in hostel',
    gradient: ['#EC4899', '#F97316'],
    color: '#EC4899'
  },
];

const UserTypeSelector = ({ visible, onSave, onCancel, loading = false }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [spinValue] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  React.useEffect(() => {
    if (loading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      
      return () => spinAnimation.stop();
    } else {
      spinValue.setValue(0);
    }
  }, [loading]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSave = () => {
    if (selectedType !== null) {
      onSave(selectedType);
    }
  };

  const handleOptionPress = (typeId) => {
    setSelectedType(typeId);
    // Add haptic feedback if available
    if (global.HapticFeedback) {
      global.HapticFeedback.impactAsync(global.HapticFeedback.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onCancel}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <Card style={styles.modalCard} elevation={8}>
              <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.cardGradient}
              >
                <View style={styles.headerContainer}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name="account-cog"
                      size={32} // Reduced from 40
                      color={colors.primary}
                    />
                  </View>
                  <Title style={styles.modalTitle}>
                    Choose Your Profile
                  </Title>
                  <Text style={styles.modalDescription}>
                    Help us personalize your canteen experience by selecting your student category
                  </Text>
                </View>

                <View style={styles.optionsContainer}>
                  {USER_TYPES.map((type, index) => {
                    const isSelected = selectedType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.optionCard,
                          isSelected && styles.selectedOptionCard,
                        ]}
                        onPress={() => handleOptionPress(type.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.optionContent}>
                          <View style={[
                            styles.iconCircle,
                            { backgroundColor: isSelected ? type.color + '20' : colors.background }
                          ]}>
                            <MaterialCommunityIcons
                              name={type.icon}
                              size={24} // Reduced from 32
                              color={isSelected ? type.color : colors.textSecondary}
                            />
                          </View>
                          
                          <View style={styles.optionTextContainer}>
                            <Text style={[
                              styles.optionTitle,
                              isSelected && { color: type.color }
                            ]}>
                              {type.label}
                            </Text>
                            <Text style={styles.optionDescription}>
                              {type.description}
                            </Text>
                          </View>

                          <View style={[
                            styles.checkContainer,
                            isSelected && styles.selectedCheckContainer,
                            { borderColor: type.color }
                          ]}>
                            {isSelected && (
                              <MaterialCommunityIcons
                                name="check"
                                size={16} // Reduced from 18
                                color={colors.white}
                              />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={onCancel}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons 
                      name="close" 
                      size={18} // Reduced from 20
                      color={colors.textSecondary} 
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      selectedType ? styles.continueButtonEnabled : styles.continueButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={selectedType === null || loading}
                    activeOpacity={selectedType ? 0.8 : 1}
                  >
                    <LinearGradient
                      colors={selectedType 
                        ? USER_TYPES.find(t => t.id === selectedType)?.gradient || [colors.primary, colors.primaryDark]
                        : [colors.disabled, colors.disabled]
                      }
                      style={styles.continueButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <MaterialCommunityIcons 
                              name="loading" 
                              size={18} // Reduced from 20
                              color={colors.white} 
                              style={styles.buttonIcon}
                            />
                          </Animated.View>
                          <Text style={styles.continueButtonText}>Loading...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContentContainer}>
                          <MaterialCommunityIcons 
                            name="check-bold" 
                            size={18} // Reduced from 20
                            color={colors.white} 
                            style={styles.buttonIcon}
                          />
                          <Text style={styles.continueButtonText}>Continue</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Card>
          </Animated.View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md, // Reduced from spacing.lg
  },
  modalContainer: {
    width: '95%', // Increased from 100% to ensure margin
    maxWidth: 350, // Reduced from 400
  },
  modalCard: {
    borderRadius: borderRadius.lg, // Reduced from borderRadius.xl
    overflow: 'hidden',
  },
  cardGradient: {
    padding: spacing.lg, // Reduced from spacing.xl
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg, // Reduced from spacing.xl
  },
  iconContainer: {
    width: 60, // Reduced from 80
    height: 60, // Reduced from 80
    borderRadius: 30, // Reduced from 40
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm, // Reduced from spacing.md
  },
  modalTitle: {
    fontSize: fontSize.xl, // Reduced from fontSize.xxl
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs, // Reduced from spacing.sm
  },
  modalDescription: {
    fontSize: fontSize.xs, // Reduced from fontSize.sm
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.4, // Adjusted for new size
    paddingHorizontal: spacing.sm, // Reduced from spacing.md
  },
  optionsContainer: {
    marginBottom: spacing.lg, // Reduced from spacing.xl
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md, // Reduced from borderRadius.lg
    padding: spacing.md, // Reduced from spacing.lg
    marginBottom: spacing.sm, // Reduced from spacing.md
    borderWidth: 1.5, // Reduced from 2
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    minHeight: 70, // Reduced from 85
    justifyContent: 'center',
  },
  selectedOptionCard: {
    borderColor: colors.primary,
    elevation: 6,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    backgroundColor: colors.primary + '05',
    transform: [{ scale: 1.01 }],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48, // Reduced from 60
  },
  iconCircle: {
    width: 48, // Reduced from 60
    height: 48, // Reduced from 60
    borderRadius: 24, // Reduced from 30
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm, // Reduced from spacing.md
    borderWidth: 1.5, // Reduced from 2
    borderColor: 'transparent',
  },
  optionTextContainer: {
    flex: 1,
    marginRight: spacing.sm, // Reduced from spacing.md
    justifyContent: 'center',
    minHeight: 40, // Reduced from 48
  },
  optionTitle: {
    fontSize: fontSize.md, // Reduced from fontSize.lg
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2, // Reduced from 4
    letterSpacing: 0.3, // Reduced from 0.5
  },
  optionDescription: {
    fontSize: fontSize.xs, // Reduced from fontSize.sm
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.3, // Adjusted for new size
    fontWeight: '400',
  },
  checkContainer: {
    width: 24, // Reduced from 28
    height: 24, // Reduced from 28
    borderRadius: 12, // Reduced from 14
    borderWidth: 1.5, // Reduced from 2
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedCheckContainer: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm, // Reduced from spacing.md
    marginTop: spacing.sm, // Reduced from spacing.md
  },
  actionButton: {
    flex: 1,
    height: 48, // Reduced from 56
    borderRadius: borderRadius.md, // Reduced from borderRadius.lg
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  continueButtonEnabled: {
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  continueButtonDisabled: {
    elevation: 1,
    shadowOpacity: 0.05,
  },
  continueButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md, // Reduced from borderRadius.lg
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm, // Reduced from fontSize.md
    fontWeight: '600',
  },
  continueButtonText: {
    color: colors.white,
    fontSize: fontSize.sm, // Reduced from fontSize.md
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default UserTypeSelector;
