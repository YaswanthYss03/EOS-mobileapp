// key_id is Razorpay's public identifier — safe to ship in the client, it's what
// Checkout uses to know which merchant account to bill. key_secret is NOT here on
// purpose: it authenticates server-to-server API calls (creating orders, verifying
// payments) and must only ever live in the backend's environment (see
// Restaurent_App/backend/.env's RAZORPAY_KEY_SECRET) — never in the app bundle.
export const RAZORPAY_CONFIG = {
  TEST: {
    key_id: 'rzp_test_R9ba3kpFxFVtPy',
  },
  LIVE: {
    key_id: 'rzp_live_R9eDcXzbFuPD4R',
  }
};

// Use test keys for development/testing
export const RAZORPAY_KEY_ID = RAZORPAY_CONFIG.LIVE.key_id;

export const CURRENCY = 'INR';
export const COMPANY_NAME = 'Craveo';

// Debug configuration
console.log('🔑 Razorpay Configuration Loaded:');
console.log(`   Key ID: ${RAZORPAY_KEY_ID}`);
console.log(`   Mode: ${RAZORPAY_KEY_ID.includes('test') ? 'TEST 🧪' : 'LIVE 🔴'}`);
console.log(`   Company: ${COMPANY_NAME}`);
console.log(`   Currency: ${CURRENCY}`);

if (RAZORPAY_KEY_ID.includes('test')) {
  console.log('   🧪 TEST MODE: Using test keys to isolate payment issues');
} else {
  console.log('   🔴 LIVE MODE: Real payments will be processed!');
}
