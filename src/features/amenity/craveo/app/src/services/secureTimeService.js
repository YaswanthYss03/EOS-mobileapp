import { getISTDate, isAfter530PMIST } from '../utils/timezoneUtils';

/**
 * Secure Time Service - Uses server time to prevent client-side manipulation
 * This prevents students from changing device time to bypass COD restrictions
 *
 * NOTE: getServerTime() used to fetch tamper-proof time from Supabase (a plain
 * table select, and a get_server_time() RPC as a fallback). The REST backend
 * does not expose a server-time endpoint (out of scope for this migration), and
 * nothing in the app actually calls getServerTime() any more — isCODEnabled()
 * (the function that actually gates COD checkout eligibility) and
 * getFormattedServerTime() both already compute time purely client-side via
 * getISTDate()/isAfter530PMIST() below, without going through getServerTime()
 * at all. So this was already not the thing enforcing COD's time restriction.
 * Since a future caller could still reasonably expect this method to return
 * *something* usable rather than crash, getServerTime() falls back to device
 * time with a loud warning (exactly like every error branch of the old
 * implementation already did) instead of throwing — this is user-facing
 * checkout-adjacent logic, so a degraded fallback is safer than a hard crash.
 */
class SecureTimeService {
  constructor() {
    this.cachedServerTime = null;
    this.cacheTimestamp = null;
    this.cacheValidityMs = 60000; // Cache for 1 minute to reduce DB calls
  }

  /**
   * Get server time. No backend endpoint for this exists yet, so this falls
   * back to device time — see class-level note above. Kept as an async method
   * with the same signature/caching behavior so any caller doesn't need to change.
   */
  async getServerTime() {
    // Check if we have valid cached time (within 1 minute)
    if (this.cachedServerTime && this.cacheTimestamp &&
        (Date.now() - this.cacheTimestamp) < this.cacheValidityMs) {
      // Return cached time adjusted for elapsed time
      const elapsedMs = Date.now() - this.cacheTimestamp;
      return new Date(this.cachedServerTime.getTime() + elapsedMs);
    }

    console.warn('⚠️ secureTimeService.getServerTime: no server-time endpoint on the backend yet — falling back to device time.');
    const serverTime = new Date();

    // Cache the (device) time anyway so repeated calls within the cache window
    // stay consistent with each other.
    this.cachedServerTime = serverTime;
    this.cacheTimestamp = Date.now();

    return serverTime;
  }

  /**
   * Check if COD is enabled based on secure server time
   * @param {number} userType - User type (3 for Girls Hosteller)
   * @returns {Promise<boolean>} - Whether COD is enabled
   */
  async isCODEnabled(userType) {
    if (!userType || userType !== 3) {
      console.log('🚫 COD not available for user type:', userType);
      return false;
    }

    try {
      // Get current IST time
      const istDate = getISTDate();
      const isEnabled = isAfter530PMIST();
      
      console.log('🕐 COD Time Check (IST):', {
        currentIST: istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        currentISTSimple: istDate.toString(),
        currentHour: istDate.getHours(),
        currentMinute: istDate.getMinutes(),
        isAfter530PM: isEnabled,
        userType,
        codAvailable: isEnabled && userType === 3
      });
      
      return isEnabled;
    } catch (error) {
      console.error('❌ COD time check failed:', error);
      return false; // Fail safe - deny COD on error
    }
  }

  /**
   * Get formatted server time for display
   */
  async getFormattedServerTime() {
    const istTime = getISTDate();
    return istTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Clear the time cache (useful for testing)
   */
  clearCache() {
    this.cachedServerTime = null;
    this.cacheTimestamp = null;
    console.log('🧹 Server time cache cleared');
  }
}

// Create and export singleton instance
const secureTimeService = new SecureTimeService();

export default secureTimeService;
