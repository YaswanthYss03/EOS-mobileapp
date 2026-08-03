import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { signup, clearError } from '../redux/slices/authSlice';
import { colors, spacing, fontSize } from '../constants/theme';
import { showToast, handleError } from '../utils/toastUtils';

const { width, height } = Dimensions.get('window');

const ImprovedSignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      // Show custom success message and navigate
      showToast.success('Account created successfully.');
      setTimeout(() => {
        navigation.replace('Main');
      }, 2000);
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    if (error) {
      handleError(error, 'Signup failed. Please try again.');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 20) {
      newErrors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain both uppercase and lowercase letters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

  const handleSignup = async () => {
    console.log('📝 HandleSignup called with formData:', {
      username: formData.username,
      password: formData.password ? 'PROVIDED' : 'NOT PROVIDED',
      confirmPassword: formData.confirmPassword ? 'PROVIDED' : 'NOT PROVIDED'
    });
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    try {
      console.log('🚀 Attempting signup');
      await dispatch(signup({
        username: formData.username,
        password: formData.password,
        user_type: 1, // Default to Day Scholar
      })).unwrap();
      
      console.log('✅ Signup successful');
    } catch (error) {
      console.error('❌ Signup failed:', error);
      await handleError(error, 'Signup failed. Please check your details and try again.');
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 'none', color: colors.lightGray, text: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (/(?=.*[a-z])(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*])/.test(password)) score++;
    
    if (score <= 1) return { strength: 'weak', color: colors.error, text: 'Weak' };
    if (score === 2) return { strength: 'fair', color: '#FFA500', text: 'Fair' };
    if (score === 3) return { strength: 'good', color: '#32CD32', text: 'Good' };
    return { strength: 'strong', color: '#006400', text: 'Strong' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
              <Text style={styles.subtitle}>Create your account and start ordering!</Text>
            </View>

            {/* Signup Card */}
            <Card style={styles.signupCard} elevation={8}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.headerContainer}>
                  <MaterialCommunityIcons 
                    name="account-plus" 
                    size={40} 
                    color={colors.primary} 
                  />
                  <Title style={styles.cardTitle}>Create Account</Title>
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
                  {formData.password && !errors.password && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={[styles.passwordStrengthBar, { backgroundColor: passwordStrength.color }]} />
                      <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                        {passwordStrength.text}
                      </Text>
                    </View>
                  )}
                  {errors.password && (
                    <HelperText type="error" style={styles.errorText}>
                      {errors.password}
                    </HelperText>
                  )}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Confirm Password"
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    mode="outlined"
                    secureTextEntry={!showConfirmPassword}
                    style={styles.input}
                    theme={{
                      colors: { 
                        primary: colors.primary,
                        outline: errors.confirmPassword ? colors.error : colors.lightGray,
                      }
                    }}
                    left={
                      <TextInput.Icon 
                        icon="lock-check" 
                        color={colors.primary}
                      />
                    }
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? "eye-off" : "eye"}
                        color={colors.primary}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                    error={!!errors.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <HelperText type="error" style={styles.errorText}>
                      {errors.confirmPassword}
                    </HelperText>
                  )}
                </View>

                {/* Terms Notice */}
                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                  </Text>
                </View>

                {/* Signup Button */}
                <Button
                  mode="contained"
                  onPress={handleSignup}
                  style={styles.signupButton}
                  contentStyle={styles.signupButtonContent}
                  labelStyle={styles.signupButtonText}
                  disabled={loading}
                  theme={{ colors: { primary: colors.primary } }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    'Create Account'
                  )}
                </Button>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Discover the easiest way to order on campus
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
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
    minHeight: height * 0.9,
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
  signupCard: {
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
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  passwordStrengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  passwordStrengthText: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  termsText: {
    fontSize: fontSize.sm,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 18,
  },
  signupButton: {
    marginTop: spacing.md,
    borderRadius: 30,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  signupButtonContent: {
    height: 50,
  },
  signupButtonText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    color: colors.darkGray,
    fontSize: fontSize.md,
  },
  loginLink: {
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

export default ImprovedSignupScreen;
