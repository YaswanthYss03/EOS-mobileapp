import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { logout, refreshUserData } from '../redux/slices/authSlice';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { authAPI } from '../services';
import UserTypeSelector from '../components/UserTypeSelector';
import CraveoBottomNav from '../components/CraveoBottomNav';
import { EnhancedProfileLoader } from '../components/EnhancedLoaders';
import { useToast } from '../contexts/ToastContext';
import { showToast } from '../utils/toastUtils';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import { fonts } from '../../../../../../theme';

const USER_TYPE_LABELS = {
  1: 'Day Scholar',
  2: 'Boys Hosteller', 
  3: 'Girls Hosteller'
};

// Helper function to capitalize first letter of each word
const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { showSuccess, showError } = useToast();
  
  const [userProfile, setUserProfile] = useState(null);
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);
  const [updatingUserType, setUpdatingUserType] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // Debug current user state
    console.log('👤 ProfileScreen - Current user state:', {
      user,
      userId: user?.user_id,
      userIdType: typeof user?.user_id,
      username: user?.username,
      userType: user?.user_type
    });
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      console.log('📊 ProfileScreen - Fetching profile for user:', user?.user_id);
      
      if (user?.user_id) {
        const response = await authAPI.getUserProfile(user.user_id);
        
        console.log('📊 ProfileScreen - Profile fetch response:', response);
        
        if (response.success) {
          setUserProfile(response.data);
          
          // Check if user_type is null and show selector
          if (!response.data.user_type) {
            console.log('ℹ️ ProfileScreen - User type is null, showing selector');
            setShowUserTypeSelector(true);
          } else {
            console.log('✅ ProfileScreen - User type already set:', response.data.user_type);
          }
        } else {
          console.error('❌ ProfileScreen - Failed to fetch profile:', response.error);
        }
      } else {
        console.error('❌ ProfileScreen - No user ID available');
      }
    } catch (error) {
      console.error('💥 ProfileScreen - Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserType = async (userType) => {
    try {
      setUpdatingUserType(true);
      
      // Debug user information
      console.log('🔄 ProfileScreen - Updating user type:', {
        userType,
        currentUser: user,
        userId: user?.user_id,
        userIdType: typeof user?.user_id
      });
      
      if (!user?.user_id) {
        showError('User ID not found. Please log out and log back in.');
        return;
      }
      
      const response = await authAPI.updateUserType(user.user_id, userType);
      
      console.log('📊 ProfileScreen - Update response:', response);
      
      if (response.success) {
        setUserProfile(prev => ({ ...prev, user_type: userType }));
        setShowUserTypeSelector(false);
        showSuccess('Your profile has been updated successfully!');
        
        // Refresh user data in Redux to update user_type
        try {
          await dispatch(refreshUserData()).unwrap();
          console.log('✅ ProfileScreen: Redux user data refreshed after user type update');
        } catch (refreshError) {
          console.warn('⚠️ ProfileScreen: Failed to refresh Redux user data:', refreshError);
        }
      } else {
        console.error('ProfileScreen - Update failed:', response.error);
        showError('Could not update your profile. Please try again.');
      }
    } catch (error) {
      console.error('ProfileScreen - Update error:', error);
      showError('Could not update your profile. Please try again.');
    } finally {
      setUpdatingUserType(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    dispatch(logout());
    showToast.success('You have been logged out successfully');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case 1: return 'school';
      case 2: return 'account-group';
      case 3: return 'account-group-outline';
      default: return 'account-question';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <EnhancedProfileLoader
          size="xlarge"
          text="Setting up your profile..."
        />
        <CraveoBottomNav navigation={navigation} currentRoute="Profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {String(user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || user?.user_name?.charAt(0)?.toUpperCase() || 'S')}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>
            {capitalizeWords(String(user?.name || user?.username || user?.user_name || 'Student'))}
          </Text>

          {/* User Type Display */}
          {userProfile && userProfile.user_type ? (
            <View style={styles.userTypeContainer}>
              <MaterialCommunityIcons
                name={getUserTypeIcon(userProfile.user_type)}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.userTypeText}>
                {String(USER_TYPE_LABELS[userProfile.user_type] || 'Unknown')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Profile Settings */}
        {userProfile && userProfile.user_type ? (
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Student Type</Text>
                <Text style={styles.settingDescription}>
                  {String(USER_TYPE_LABELS[userProfile.user_type] || 'Not Set')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setShowUserTypeSelector(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* App Credits Card */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsMainContent}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/Logo 3.png')}
                style={styles.collegeLogo}
                resizeMode="contain"
              />
            </View>

            {/* App Info Section */}
            <View style={styles.appInfoSection}>
              <Text style={styles.appName}>Craveo</Text>
              <Text style={styles.appTagline}>Canteen Ordering App</Text>
              <Text style={styles.collegeTagline}>Designed Exclusively for College Campuses</Text>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.creditsFooter}>
            <View style={styles.pavakieFooter}>
              <Image
                source={require('../../assets/pavakie.png')}
                style={styles.pavakieLogoFooter}
                resizeMode="contain"
              />
              <Text style={styles.pavakieText}>@Craveo - Powered By Pavakie</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <MaterialCommunityIcons name="logout" size={18} color={colors.white} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* User Type Selector Modal */}
      <UserTypeSelector
        visible={showUserTypeSelector}
        onSave={handleUpdateUserType}
        onCancel={() => setShowUserTypeSelector(false)}
        loading={updatingUserType}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />

      <CraveoBottomNav navigation={navigation} currentRoute="Profile" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 60,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 100, // Space for bottom navigation
  },
  userCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  userName: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginTop: spacing.sm,
  },
  userTypeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fonts.semibold,
    marginLeft: spacing.xs,
  },
  settingsCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  changeButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  changeButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fonts.semibold,
  },
  creditsCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  creditsMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoSection: {
    marginRight: spacing.lg,
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  collegeLogo: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  appInfoSection: {
    flex: 1,
  },
  appName: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  appTagline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
  collegeTagline: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontFamily: fonts.semibold,
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 16,
  },
  versionText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    opacity: 0.7,
  },
  creditsFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  pavakieFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pavakieLogoFooter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  pavakieText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    opacity: 0.8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.error,
    elevation: 3,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
});

export default ProfileScreen;
