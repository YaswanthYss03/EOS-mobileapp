// User Debug Utility - for debugging user type and COD issues
// Run this in your mobile app console to debug user and COD issues

import { useSelector } from 'react-redux';
import secureTimeService from '../services/secureTimeService';
import { isAfter530PMIST, getISTDate } from '../utils/timezoneUtils';

export const debugUserAndCOD = async () => {
  console.log('=== USER & COD DEBUG UTILITY ===');
  
  // Get current user from Redux store
  // Note: This should be called from within a React component to access useSelector
  // For debugging, you can manually log the user object
  
  console.log('1. CURRENT TIME CHECKS:');
  const istTime = getISTDate();
  const isAfter530 = isAfter530PMIST();
  
  console.log('Current IST Time:', istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('Is after 5:30 PM IST:', isAfter530);
  console.log('Current hour:', istTime.getHours());
  console.log('Current minute:', istTime.getMinutes());
  
  console.log('\n2. USER TYPE MAPPING:');
  console.log('1 = Day Scholar (COD: Never)');
  console.log('2 = Boys Hosteller (COD: Never)');
  console.log('3 = Girls Hosteller (COD: Only after 5:30 PM IST)');
  
  console.log('\n3. COD ELIGIBILITY TESTS:');
  
  // Test for each user type
  for (let userType = 1; userType <= 3; userType++) {
    const codResult = await secureTimeService.isCODEnabled(userType);
    const userTypeName = userType === 1 ? 'Day Scholar' : 
                        userType === 2 ? 'Boys Hosteller' : 'Girls Hosteller';
    
    console.log(`User Type ${userType} (${userTypeName}): COD ${codResult ? 'ENABLED' : 'DISABLED'}`);
  }
  
  console.log('\n4. MANUAL USER DEBUGGING:');
  console.log('To debug your current user:');
  console.log('1. Check Redux store: console.log(store.getState().auth.user)');
  console.log('2. Verify user_type field exists and has correct value');
  console.log('3. Check if user object is properly populated from login');
  
  return {
    istTime: istTime.toISOString(),
    isAfter530PM: isAfter530,
    currentHour: istTime.getHours(),
    currentMinute: istTime.getMinutes(),
    codEligibleUserTypes: isAfter530 ? [3] : [],
    timeToNextCOD: isAfter530 ? 0 : ((17 * 60 + 30) - (istTime.getHours() * 60 + istTime.getMinutes()))
  };
};

// Component to debug current user
export const UserDebugComponent = () => {
  const { user } = useSelector(state => state.auth);
  
  React.useEffect(() => {
    console.log('=== CURRENT USER DEBUG ===');
    console.log('User object:', user);
    console.log('User ID:', user?.user_id);
    console.log('Username:', user?.username);
    console.log('User Type:', user?.user_type);
    console.log('User Type Name:', 
      user?.user_type === 1 ? 'Day Scholar' : 
      user?.user_type === 2 ? 'Boys Hosteller' : 
      user?.user_type === 3 ? 'Girls Hosteller' : 'Unknown'
    );
    
    // Test COD eligibility for current user
    if (user?.user_type) {
      secureTimeService.isCODEnabled(user.user_type).then(codResult => {
        console.log('COD Eligible for current user:', codResult);
      });
    }
  }, [user]);
  
  return null; // This component doesn't render anything
};

export default { debugUserAndCOD, UserDebugComponent };
