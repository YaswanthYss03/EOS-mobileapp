import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { login, clearError } from '../redux/slices/authSlice';
import { showToast, handleError } from '../utils/toastUtils';
import PasswordSetupModal from '../components/PasswordSetupModal';
import { authAPI } from '../services/backendAPI';
import { fonts } from '../../../../../../theme';

// Same blue-gradient/plain-field look as the main EOS login screen (see
// src/features/auth/LoginScreen.tsx), styled to sit directly beneath the
// "← Craveo" header CraveoScreen.tsx always renders above this whole
// nested app - so no back button or "Craveo" title here (that header
// already has both; a second one duplicated it). This hero is just a
// welcome banner: logo + tagline, no title text, no navigation. Every
// field/validation/login handler below is unchanged from before - only
// the JSX/styling changed.
const ImprovedLoginScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Password setup modal state — for accounts (e.g. bulk-imported students) that
  // exist in user_table but don't have a password set yet.
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false);
  const [passwordSetupLoading, setPasswordSetupLoading] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);

  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Main');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    if (error) {
      handleError(error, 'Login failed. Please try again.');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleLogin = async () => {
    console.log('🔑 HandleLogin called with formData:', formData);

    // Only validate username first (password will be validated later or in modal)
    if (!formData.username) {
      setErrors({ username: 'Username is required' });
      return;
    }

    if (formData.username.length < 3) {
      setErrors({ username: 'Username must be at least 3 characters' });
      return;
    }

    try {
      console.log('🔍 Checking password status for username:', formData.username);

      // First, check if user exists and has password
      const passwordStatus = await authAPI.checkPasswordStatus(formData.username);
      console.log('📊 Password status result:', passwordStatus);

      if (!passwordStatus.success || !passwordStatus.userExists) {
        setErrors({ username: 'Username not found. Please check your username or create an account.' });
        return;
      }

      if (!passwordStatus.hasPassword) {
        // User exists but no password set - show password setup modal
        console.log('🔐 User has no password, showing setup modal');
        setCurrentUserInfo(passwordStatus.data);
        setShowPasswordSetupModal(true);
        return;
      }

      // User has password - proceed with normal login
      console.log('🔐 User has password, proceeding with normal login');

      if (!formData.password) {
        setErrors({ password: 'Password is required' });
        return;
      }

      if (formData.password.length < 6) {
        setErrors({ password: 'Password must be at least 6 characters' });
        return;
      }

      console.log('🚀 Attempting login with username and password');
      await dispatch(login({
        username: formData.username,
        password: formData.password,
      })).unwrap();

      console.log('✅ Login successful, navigating to main');
      showToast.success('Welcome back!');

    } catch (error) {
      console.error('❌ Login process failed:', error);
      await handleError(error, 'Login failed. Please check your credentials and try again.');
    }
  };

  const handlePasswordSetup = async (password) => {
    try {
      setPasswordSetupLoading(true);
      console.log('🔐 Setting password for user:', currentUserInfo?.user_id);

      const result = await authAPI.setPassword(currentUserInfo.user_id, password);

      if (!result.success) {
        throw new Error(result.error || 'Failed to set password');
      }

      console.log('✅ Password set successfully');
      showToast.success('Password set successfully.');

      // Close modal and update form
      setShowPasswordSetupModal(false);
      setPasswordSetupLoading(false);

      // Auto-fill password and attempt login
      setFormData(prev => ({ ...prev, password: password }));

      // Small delay then auto-login
      setTimeout(async () => {
        try {
          await dispatch(login({
            username: formData.username,
            password: password,
          })).unwrap();

          console.log('✅ Auto-login after password setup successful');
          showToast.success('Welcome!');
        } catch (loginError) {
          console.error('❌ Auto-login after password setup failed:', loginError);
          await handleError(loginError, 'Password set but login failed. Please try logging in manually.');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Password setup failed:', error);
      setPasswordSetupLoading(false);
      await handleError(error, 'Failed to set password. Please try again.');
    }
  };

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="light-content" backgroundColor="#1A3D8F" />

        {/* No title text or back button here - CraveoScreen.tsx already
            renders a "← Craveo" header above this entire nested app, on
            every screen including this one. This is just a welcome
            banner (logo + tagline), same gradient as that header so the
            two read as one continuous blue area. */}
        <LinearGradient
          colors={['#2F6FE0', '#1A3D8F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.logoWrapper}>
            <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.tagline}>Your campus food, just a tap away</Text>
        </LinearGradient>

        <View style={styles.formSection}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.welcomeSubtext}>Sign in to order from the canteen</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
            />
            {errors.username ? <Text style={styles.fieldError}>{errors.username}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                editable={!loading}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PasswordSetupModal
        visible={showPasswordSetupModal}
        userInfo={currentUserInfo}
        loading={passwordSetupLoading}
        onPasswordSet={handlePasswordSetup}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoWrapper: {
    width: 132,
    height: 132,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  logoImage: {
    width: 132,
    height: 132,
  },
  tagline: {
    color: '#D7E2FA',
    fontSize: 13,
    fontFamily: fonts.semibold,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#111827',
  },
  welcomeSubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: '#111827',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: '#111827',
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 6,
  },
  button: {
    backgroundColor: '#235EAA',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#235EAA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#7A9BC4',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});

export default ImprovedLoginScreen;
