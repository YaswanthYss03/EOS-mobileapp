// ==================================================
// BULLETPROOF PAYMENT CLEANUP SERVICE
// Automatically handles abandoned payments every 30 seconds
//
// NOTE: this relied on the Supabase RPC `cleanup_abandoned_payments_simple`,
// which has no equivalent in the new backend API yet (out of scope for the
// Supabase-removal migration — order creation is now atomic/single-step, so
// there should be far fewer abandoned-payment rows to begin with). Runs as a
// no-op until that backend endpoint exists, rather than calling Supabase
// directly from the client.
// ==================================================

class PaymentCleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.cleanupCount = 0;
  }

  // Start the automatic cleanup service
  start() {
    if (this.isRunning) {
      console.log('🔄 Payment cleanup service already running');
      return;
    }

    console.log('🚀 Starting automatic payment cleanup service (every 30 seconds)');
    this.isRunning = true;
    
    // Run immediately first
    this.runCleanup();
    
    // Then run every 30 seconds
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, 30000); // 30 seconds
  }

  // Stop the service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Payment cleanup service stopped');
  }

  // Run the cleanup process
  async runCleanup() {
    // No backend endpoint for this yet (see file header) — stop the interval
    // rather than logging a warning every 30 seconds forever.
    console.warn('⚠️ Payment cleanup not yet migrated to backend API — skipping and stopping service');
    this.stop();
  }

  // Manual cleanup trigger
  async cleanupNow() {
    console.log('🔧 Manual payment cleanup triggered');
    await this.runCleanup();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupCount: this.cleanupCount,
      intervalId: this.intervalId
    };
  }
}

// Create singleton instance
const paymentCleanupService = new PaymentCleanupService();

// Auto-start the service when app loads
setTimeout(() => {
  paymentCleanupService.start();
}, 2000); // Start after 2 seconds to let app initialize

export default paymentCleanupService;

// Export individual functions for manual use
export const startPaymentCleanup = () => paymentCleanupService.start();
export const stopPaymentCleanup = () => paymentCleanupService.stop();
export const cleanupPaymentsNow = () => paymentCleanupService.cleanupNow();
export const getCleanupStatus = () => paymentCleanupService.getStatus();