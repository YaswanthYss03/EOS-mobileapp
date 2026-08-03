// API Configuration — points at Restaurent_App/backend (Express + Prisma).
// Set EXPO_PUBLIC_API_BASE_URL in .env to override for a real device/deployed
// backend; this only falls back to a local dev address if that's unset.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

// Alternative API URLs to try if API_BASE_URL is unreachable (e.g. testing on a
// physical device against a backend running on the dev machine's LAN IP).
export const API_ENDPOINTS_FALLBACK = [
  'http://192.168.1.4:3001/api',  // Primary IP
  'http://localhost:3001/api',     // For emulator/dev
  'http://127.0.0.1:3001/api',     // Local fallback
  'http://10.0.2.2:3001/api'       // Android emulator bridge
];

// API Endpoints — paths are relative to API_BASE_URL (which already includes the
// `/api` prefix). These match the real routes exposed by Restaurent_App/backend
// (see backend/server.js's app.use(...) mounts).
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  ME: '/auth/me',

  // Menu
  GET_DISHES: '/menu/dishes',
  GET_DISH_BY_ID: '/menu/dishes/:dishId',
  GET_CATEGORIES: '/menu/categories',

  // Secure orders (require Bearer token)
  CREATE_SECURE_ORDER: '/secure/orders/create',
  VALIDATE_CART: '/secure/orders/validate-cart',
  VERIFY_SECURE_PAYMENT: '/secure/orders/payments/verify',
  GET_USER_ORDERS: '/secure/orders/user/:userId',

  // Staff (require Bearer token with staff/admin role)
  STAFF_CREATE_ORDER: '/staff/orders',
  STAFF_STATS_TODAY: '/staff/stats/today',
  STAFF_STATS_DISHES: '/staff/stats/dishes',
  STAFF_ORDER_HISTORY: '/staff/orders/history',

  // Payment (Razorpay)
  CREATE_RAZORPAY_ORDER: '/payments/create-razorpay-order',
  VERIFY_RAZORPAY_PAYMENT: '/payments/verify-payment',

  // Today's special
  TODAYS_SPECIAL_CURRENT: '/todays-special/current',
  TODAYS_SPECIAL_BY_MEAL: '/todays-special/:mealType',
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

// Menu Categories (matching Supabase categories - all 10 categories)
export const MENU_CATEGORIES = [
  'Breakfast',
  'Lunch', 
  'Snacks',
  'Drinks',
  'Sweets',
  'Fast Food',
  'Chinese',
  'North Indian',
  'South Indian',
  'Desserts'
];

// UPI Apps for Intent
export const UPI_APPS = [
  {
    name: 'Google Pay',
    package: 'com.google.android.apps.nbu.paisa.user',
    scheme: 'gpay',
  },
  {
    name: 'PhonePe',
    package: 'com.phonepe.app',
    scheme: 'phonepe',
  },
  {
    name: 'Paytm',
    package: 'net.one97.paytm',
    scheme: 'paytm',
  },
  {
    name: 'Amazon Pay',
    package: 'in.amazon.mShop.android.shopping',
    scheme: 'amazonpay',
  },
  {
    name: 'BHIM',
    package: 'in.org.npci.upiapp',
    scheme: 'bhim',
  },
];

// App Configuration
export const APP_CONFIG = {
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MAX_CART_ITEMS: 50,
  MIN_ORDER_AMOUNT: 1, // Changed from 10 to 1 rupee
  QR_SCAN_TIMEOUT: 30000, // 30 seconds
  TOKEN_DISPLAY_DURATION: 300000, // 5 minutes
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  INVENTORY_UNAVAILABLE: 'Some items may be temporarily unavailable. Please check individual dish availability.',
  ITEM_OUT_OF_STOCK: 'This item is currently sold out.',
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  QR_SCAN_FAILED: 'QR code scan failed. Please try again.',
  INVALID_TOKEN: 'Invalid or expired token.',
  ORDER_NOT_FOUND: 'Order not found.',
  BOOKING_CLOSED: 'Booking is currently closed. Please try again later.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  ORDER_PLACED: 'Order placed successfully!',
  PAYMENT_SUCCESS: 'Payment completed successfully!',
  ORDER_DELIVERED: 'Order has been delivered!',
};
