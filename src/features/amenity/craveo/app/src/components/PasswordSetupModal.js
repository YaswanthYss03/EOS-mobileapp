import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  Card,
  Title,
  HelperText,
  IconButton,
} from 'react-native-paper';
import { colors, spacing, fontSize } from '../constants/theme';
import { fonts } from '../../../../../../theme';

const PasswordSetupModal = ({ 
  visible, 
  onPasswordSet, 
  userInfo,
  loading = false,
  onClose = null // Optional close handler (for our case, it won't be used since it's mandatory)
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validatePassword = () => {
    const newErrors = {};

    // Password validation rules (same as ImprovedSignupScreen)
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      newErrors.password = 'Password must contain both uppercase and lowercase letters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSetPassword = () => {
    if (validatePassword()) {
      onPasswordSet(password);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={false} // Cannot be dismissed - mandatory setup
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* Header */}
              <View style={styles.header}>
                <IconButton
                  icon="lock-plus"
                  size={60}
                  iconColor={colors.primary}
                />
                <Title style={styles.title}>Setup Your Password</Title>
                <Text style={styles.subtitle}>
                  Welcome {userInfo?.username}! 
                  {'\n'}Please set a secure password for your account to continue.
                </Text>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  error={!!errors.password}
                  style={styles.input}
                  mode="outlined"
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password}
                </HelperText>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  error={!!errors.confirmPassword}
                  style={styles.input}
                  mode="outlined"
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
                <HelperText type="error" visible={!!errors.confirmPassword}>
                  {errors.confirmPassword}
                </HelperText>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                <Text style={[
                  styles.requirement,
                  password.length >= 6 && styles.requirementMet
                ]}>
                  • At least 6 characters
                </Text>
                <Text style={[
                  styles.requirement,
                  /(?=.*[a-z])(?=.*[A-Z])/.test(password) && styles.requirementMet
                ]}>
                  • Contains uppercase and lowercase letters
                </Text>
                <Text style={[
                  styles.requirement,
                  password === confirmPassword && password && styles.requirementMet
                ]}>
                  • Passwords match
                </Text>
              </View>

              {/* Action Button */}
              <Button
                mode="contained"
                onPress={handleSetPassword}
                loading={loading}
                disabled={loading || !password || !confirmPassword}
                style={styles.setPasswordButton}
                contentStyle={styles.buttonContent}
              >
                {loading ? 'Setting Password...' : 'Set Password'}
              </Button>
            </Card.Content>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderRadius: 16,
  },
  cardContent: {
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    color: colors.textSecondary,
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
  },
  requirementsContainer: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  requirementsTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  requirement: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: fonts.regular,
  },
  requirementMet: {
    color: colors.success,
    fontFamily: fonts.medium,
  },
  setPasswordButton: {
    marginTop: spacing.md,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
});

export default PasswordSetupModal;
