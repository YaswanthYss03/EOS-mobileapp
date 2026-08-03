// Debug script to test mobile app database permissions
// Run this in your mobile app to diagnose permission issues

import { debugAPI } from '../services/backendAPI';

export const runDatabaseDiagnostics = async () => {
  console.log('🔍 STARTING COMPREHENSIVE DATABASE DIAGNOSTICS...');
  console.log('======================================================');
  
  try {
    const result = await debugAPI.testDatabasePermissions();
    
    console.log('📊 DIAGNOSTIC RESULTS:', result);
    
    if (result.success) {
      console.log('✅ Tests completed successfully');
      console.log('🧪 Test Results Summary:');
      Object.entries(result.tests).forEach(([test, status]) => {
        const icon = status === 'PASSED' ? '✅' : '❌';
        console.log(`${icon} ${test}: ${status}`);
      });
    } else {
      console.error('❌ Diagnostic failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Failed to run diagnostics:', error);
  }
  
  console.log('======================================================');
  console.log('🔍 DIAGNOSTICS COMPLETED');
};

// Export for easy access
export default runDatabaseDiagnostics;