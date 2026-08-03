import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  ActivityIndicator,
  HelperText,
  IconButton,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { login, clearError } from '../redux/slices/authSlice';
import { colors, spacing, fontSize } from '../constants/theme';
import { showToast, handleError } from '../utils/toastUtils';
import PasswordSetupModal from '../components/PasswordSetupModal';
import { authAPI } from '../services/backendAPI';

const { width, height } = Dimensions.get('window');

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.logo}
                  resizeMode="cover"
                />
              </View>
              <Title style={styles.appTitle}>Fortune Flavours</Title>
              <Text style={styles.subtitle}>Welcome back! Please sign in to continue</Text>
            </View>

            {/* Login Card */}
            <Card style={styles.loginCard} elevation={8}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.headerContainer}>
                  <MaterialCommunityIcons 
                    name="account-circle" 
                    size={40} 
                    color={colors.primary} 
                  />
                  <Title style={styles.cardTitle}>Sign In</Title>
                </View>

                {/* Username Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Username"
                    value={formData.username}
                    onChangeText={(value) => handleInputChange('username', value)}
                    mode="outlined"
                    style={styles.input}
                    theme={{
                      colors: { 
                        primary: colors.primary,
                        outline: errors.username ? colors.error : colors.lightGray,
                      }
                    }}
                    left={
                      <TextInput.Icon 
                        icon="account" 
                        color={colors.primary}
                      />
                    }
                    error={!!errors.username}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {errors.username && (
                    <HelperText type="error" style={styles.errorText}>
                      {errors.username}
                    </HelperText>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Password"
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    theme={{
                      colors: { 
                        primary: colors.primary,
                        outline: errors.password ? colors.error : colors.lightGray,
                      }
                    }}
                    left={
                      <TextInput.Icon 
                        icon="lock" 
                        color={colors.primary}
                      />
                    }
                    right={
                      <TextInput.Icon
                        icon={showPassword ? "eye-off" : "eye"}
                        color={colors.primary}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                    error={!!errors.password}
                  />
                  {errors.password && (
                    <HelperText type="error" style={styles.errorText}>
                      {errors.password}
                    </HelperText>
                  )}
                </View>

                {/* Login Button */}
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                  labelStyle={styles.loginButtonText}
                  disabled={loading}
                  theme={{ colors: { primary: colors.primary } }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Sign Up Link */}
                {/* <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don't have an account?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View> */}
              </Card.Content>
            </Card>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Your campus Food, just a tap away
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    minHeight: height * 0.8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45, // Make it circular to fit the icon better
  },
  appTitle: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.xs,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '300',
  },
  loginCard: {
    borderRadius: 20,
    marginBottom: spacing.lg,
    backgroundColor: 'white',
  },
  cardContent: {
    padding: spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: 'white',
    fontSize: fontSize.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  loginButton: {
    marginTop: spacing.lg,
    borderRadius: 30,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonContent: {
    height: 50,
  },
  loginButtonText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signupText: {
    color: colors.darkGray,
    fontSize: fontSize.md,
  },
  signupLink: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

export default ImprovedLoginScreen;
