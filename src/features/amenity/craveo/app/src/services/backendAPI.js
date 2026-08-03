// HTTP-backed replacement for the old supabaseAPI.js.
//
// This talks to the Express + Prisma backend at Restaurent_App/backend over REST
// (see httpClient.js) instead of hitting Supabase directly from the client. The
// exported shape (authAPI, menuAPI, orderAPI, paymentAPI, qrAPI, staffAPI,
// todaysSpecialAPI, utilsAPI/debugAPI) mirrors the old supabaseAPI.js so screens
// that import from '../services' or '../services/api' don't need to change.
//
// Functions with no backend equivalent yet (inventory reservation RPCs, abandoned
// payment cleanup, and the kiosk/print-job workflow) are left as clearly-labeled
// stubs that throw — see NOT_MIGRATED_MESSAGE usages below.
import { apiRequest, decodeJwtPayload, getStoredUser, saveSession, clearSession, getToken } from './httpClient';
import { getDatabaseTimestamp } from '../utils/timezoneUtils';

const notMigrated = (feature) => {
  throw new Error(
    `${feature} is not yet migrated to the backend API. This relied on a Supabase RPC/table that the new REST backend does not expose.`
  );
};

// =============================================================================
// AUTH
// =============================================================================
export const authAPI = {
  signup: async ({ username, password, role = 'customer', name, user_type }) => {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await apiRequest('/auth/signup', {
        method: 'POST',
        auth: false,
        body: { username, password, role, name, user_type },
      });

      await saveSession(response.token, response.user);

      return {
        user: response.user,
        token: response.token,
        success: true,
        message: 'Account created successfully',
      };
    } catch (error) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Signup failed');
    }
  },

  login: async ({ username, password }) => {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        auth: false,
        body: { username, password },
      });

      await saveSession(response.token, response.user);

      return {
        user: response.user,
        token: response.token,
        success: true,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  },

  logout: async () => {
    try {
      await clearSession();
      return { success: true, message: 'Logout successful' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message, message: 'Logout failed' };
    }
  },

  // Restores {user, token} from the stored session, re-validated against GET /auth/me.
  getCurrentSession: async () => {
    try {
      const stored = await getStoredUser();
      const response = await apiRequest('/auth/me', { method: 'GET' });
      const token = await getToken();

      return {
        success: true,
        data: { user: response.user || stored, token },
      };
    } catch (error) {
      console.error('Get current session error:', error);
      return { success: false, error: error.message };
    }
  },

  updateUserType: async (userId, userType) => {
    try {
      const response = await apiRequest('/auth/user-type', {
        method: 'PATCH',
        body: { user_type: userType },
      });
      const stored = await getStoredUser();
      if (stored) {
        await saveSession(await getToken(), { ...stored, user_type: response.data.user_type });
      }
      return { success: true, data: response.data, message: response.message };
    } catch (error) {
      console.error('Update user type error:', error);
      return { success: false, error: error.message || 'Failed to update user type' };
    }
  },

  getUserProfile: async () => {
    try {
      const response = await apiRequest('/auth/me', { method: 'GET' });
      return { success: true, data: response.user };
    } catch (error) {
      console.error('Get user profile error:', error);
      return { success: false, error: error.message };
    }
  },

  // Legacy demo OTP flow — no backend dependency, kept for the (currently unused)
  // ModernLoginScreen/LoginScreen variants.
  sendOTP: async () => ({ success: true, message: 'OTP sent successfully' }),

  verifyOTP: async (username, otp) => {
    if (otp && String(otp).length >= 4) {
      const demoPassword = 'demo123';
      try {
        return await authAPI.login({ username, password: demoPassword });
      } catch (_) {
        return await authAPI.signup({ username, password: demoPassword, role: 'customer' });
      }
    }
    throw new Error('Invalid OTP');
  },

  // Some accounts (e.g. bulk-imported students) are created with no password yet.
  // ImprovedLoginScreen.js calls this before attempting login to decide whether to
  // show the "create your password" modal instead of a generic login error.
  checkPasswordStatus: async (username) => {
    try {
      const response = await apiRequest('/auth/check-password-status', {
        method: 'POST',
        auth: false,
        body: { username },
      });
      return {
        success: true,
        userExists: response.userExists,
        hasPassword: response.hasPassword,
        data: response.data,
      };
    } catch (error) {
      console.error('Password status check error:', error);
      return { success: false, userExists: false, hasPassword: false, error: error.message };
    }
  },

  setPassword: async (userId, password) => {
    try {
      const response = await apiRequest('/auth/set-password', {
        method: 'POST',
        auth: false,
        body: { userId, password },
      });
      await saveSession(response.token, response.user);
      return { success: true, data: response.user, token: response.token, message: response.message };
    } catch (error) {
      console.error('Set password error:', error);
      return { success: false, error: error.message || 'Failed to set password' };
    }
  },
};

// =============================================================================
// MENU
// =============================================================================
export const menuAPI = {
  getMenu: async () => {
    try {
      const response = await apiRequest('/menu/dishes', { auth: false });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get menu error:', error);
      throw new Error(error.message || 'Failed to fetch menu');
    }
  },

  getDishes: async () => {
    try {
      const response = await apiRequest('/menu/dishes', { auth: false });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get dishes error:', error);
      throw new Error(error.message || 'Failed to fetch dishes');
    }
  },

  getAllDishes: async () => {
    try {
      const response = await apiRequest('/menu/dishes', { auth: false });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get all dishes error:', error);
      throw new Error(error.message || 'Failed to fetch dishes');
    }
  },

  getCategories: async () => {
    try {
      const response = await apiRequest('/menu/categories', { auth: false });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get categories error:', error);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  },

  // No dedicated "by category" endpoint — filter client-side from the full dish list.
  getDishesByCategory: async (categoryId) => {
    try {
      const response = await apiRequest('/menu/dishes', { auth: false });
      const data = (response.data || []).filter((d) => d.dish_category_id === categoryId);
      return { success: true, data };
    } catch (error) {
      console.error('Get dishes by category error:', error);
      throw new Error(error.message || 'Failed to fetch dishes by category');
    }
  },

  // No search endpoint — filter client-side from the full dish list.
  searchDishes: async (query) => {
    try {
      const response = await apiRequest('/menu/dishes', { auth: false });
      const q = String(query || '').toLowerCase();
      const data = (response.data || []).filter((d) => (d.name || '').toLowerCase().includes(q));
      return { success: true, data };
    } catch (error) {
      console.error('Search dishes error:', error);
      throw new Error(error.message || 'Failed to search dishes');
    }
  },

  // No realtime channel from the new backend — kept as a no-op subscription so
  // callers (MenuScreen.js, unused) don't crash. quantitySyncService.js does the
  // actual polling-based refresh.
  subscribeToInventoryUpdates: () => {
    console.log('menuAPI.subscribeToInventoryUpdates: no realtime backend — no-op subscription');
    return { unsubscribe: () => {} };
  },
};

// =============================================================================
// ORDERS
// =============================================================================
export const orderAPI = {
  // Simple client-side rate limiter, unchanged from the old implementation.
  rateLimitMap: new Map(),
  checkRateLimit: (userId, action, maxRequests = 10, windowMs = 60000) => {
    const key = `${userId}_${action}`;
    const now = Date.now();

    if (!orderAPI.rateLimitMap.has(key)) {
      orderAPI.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const bucket = orderAPI.rateLimitMap.get(key);
    if (now > bucket.resetTime) {
      bucket.count = 1;
      bucket.resetTime = now + windowMs;
      return { allowed: true, remaining: maxRequests - 1 };
    }
    if (bucket.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetIn: bucket.resetTime - now };
    }
    bucket.count++;
    return { allowed: true, remaining: maxRequests - bucket.count };
  },

  // Low-level wrapper over POST /api/secure/orders/create. Requires both a Bearer
  // token and the HMAC signature headers (see httpClient.js's REQUEST_SIGNING_SECRET
  // note — signing is currently unconfigured client-side).
  createSecureOrder: async (orderItems, orderOptions = {}) => {
    const body = {
      orderItems: orderItems.map((item) => ({
        dish_id: item.dish_id,
        quantity: item.quantity,
      })),
      totalAmount: orderOptions.totalAmount,
      paymentMethod: orderOptions.paymentMethod || orderOptions.payment_method || 'COD',
      paymentVerified: !!(orderOptions.paymentVerified || orderOptions.payment_verified),
      paymentId: orderOptions.paymentId || orderOptions.payment_id || null,
      isParcel: !!(orderOptions.isParcel || orderOptions.is_parcel),
      deliveryRequired: !!(orderOptions.deliveryRequired || orderOptions.delivery_required),
    };

    const response = await apiRequest('/secure/orders/create', {
      method: 'POST',
      body,
      auth: true,
    });

    return { success: true, data: response.data, message: response.message };
  },

  validateCart: async (items) => {
    try {
      const response = await apiRequest('/secure/orders/validate-cart', {
        method: 'POST',
        auth: true,
        body: { items: items.map((i) => ({ dish_id: i.dish_id, quantity: i.quantity })) },
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Validate cart error:', error);
      return { success: false, data: { valid: false }, error: error.message };
    }
  },

  // COD orders are created immediately (single request, matches how the backend
  // itself decrements stock and creates the order atomically in one transaction).
  createCODOrder: async (userId, orderItems, options = {}) => {
    try {
      if (!userId || !orderItems || orderItems.length === 0) {
        throw new Error('Invalid order data: userId and orderItems required');
      }

      const rateLimit = orderAPI.checkRateLimit(userId, 'cod_order', 5, 60000);
      if (!rateLimit.allowed) {
        throw new Error(
          `Rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetIn / 1000)} seconds before placing another order.`
        );
      }

      const result = await orderAPI.createSecureOrder(orderItems, {
        totalAmount: options.totalAmount,
        paymentMethod: 'COD',
        paymentVerified: false,
        paymentId: null,
        isParcel: options.isParcel,
        deliveryRequired: options.deliveryRequired,
      });

      return { success: true, data: result.data, message: 'COD order created successfully' };
    } catch (error) {
      console.error('Secure COD order creation error:', error);
      throw new Error(error.message || 'Failed to create COD order');
    }
  },

  // The new backend has no "reserve stock, confirm payment later" flow (that relied
  // on the atomic_inventory_check_and_reserve/atomic_inventory_release RPCs, which
  // are out of scope for this migration). So Razorpay orders are now created in a
  // single step, AFTER payment is verified — see confirmRazorpayOrder below. This
  // function only does an early stock/price sanity check (validate-cart) so the UI
  // can fail fast before opening the Razorpay checkout; it does not touch the DB.
  createRazorpayPendingOrder: async (userId, orderItems, options = {}) => {
    try {
      if (!userId || !orderItems || orderItems.length === 0) {
        throw new Error('Invalid order data: userId and orderItems required');
      }

      const rateLimit = orderAPI.checkRateLimit(userId, 'razorpay_order', 10, 60000);
      if (!rateLimit.allowed) {
        throw new Error(
          `Rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetIn / 1000)} seconds before placing another order.`
        );
      }

      const validation = await orderAPI.validateCart(orderItems);
      if (!validation.success || !validation.data?.valid) {
        throw new Error(validation.error || 'Cart validation failed');
      }

      return {
        success: true,
        data: {
          order_id: null,
          pending: true,
          total_amount: validation.data.total,
          items_count: validation.data.items_count,
        },
        message: 'Cart validated — order will be created once payment is confirmed',
      };
    } catch (error) {
      console.error('Razorpay pre-order validation error:', error);
      throw new Error(error.message || 'Failed to prepare order');
    }
  },

  // Actually creates the order now that Razorpay payment has succeeded. `orderContext`
  // carries what createRazorpayPendingOrder would have needed to create an order
  // upfront in the old flow: { userId, orderItems, totalAmount, options }.
  confirmRazorpayOrder: async (orderContext, paymentData) => {
    try {
      const { orderItems, totalAmount, options = {} } = orderContext || {};
      if (!orderItems || !paymentData || !paymentData.payment_id) {
        throw new Error('Invalid confirmation data: orderItems and payment_id required');
      }

      const result = await orderAPI.createSecureOrder(orderItems, {
        totalAmount,
        paymentMethod: 'Razorpay',
        paymentVerified: true,
        paymentId: paymentData.payment_id,
        isParcel: options.isParcel,
        deliveryRequired: options.deliveryRequired,
      });

      return { success: true, data: result.data, message: 'Order confirmed successfully' };
    } catch (error) {
      console.error('Secure order confirmation error:', error);
      throw new Error(error.message || 'Failed to confirm order');
    }
  },

  // Legacy dispatcher, unchanged behavior.
  createOrder: async (userId, orderItems, options = {}) => {
    console.warn('Using legacy createOrder method - consider using secure methods');
    if (options.payment_method === 'COD') {
      return orderAPI.createCODOrder(userId, orderItems, options);
    }
    return orderAPI.createRazorpayPendingOrder(userId, orderItems, options);
  },

  getUserOrders: async (userId) => {
    try {
      const response = await apiRequest(`/secure/orders/user/${userId}`, { method: 'GET' });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get user orders error:', error);
      throw new Error(error.message || 'Failed to fetch orders');
    }
  },

  // Used by OrdersScreen.js — note the response shape uses `orders`, not `data`,
  // to match what that screen already destructures.
  getOrders: async (token, userId) => {
    try {
      const response = await apiRequest(`/secure/orders/user/${userId}`, { method: 'GET' });
      return { success: true, orders: response.data || [] };
    } catch (error) {
      console.error('Get orders error:', error);
      return { success: false, message: error.message || 'Failed to fetch orders', orders: [] };
    }
  },

  // No single-order GET endpoint exists on the backend — only the user-scoped list.
  // Decode our own user_id out of the JWT we already hold and fetch the list, then
  // find the matching order client-side.
  getOrderById: async (orderId, token) => {
    try {
      let userId;
      if (token) {
        const payload = decodeJwtPayload(token);
        userId = payload && payload.user_id;
      }
      if (!userId) {
        const stored = await getStoredUser();
        userId = stored && (stored.user_id || stored.id);
      }
      if (!userId) {
        throw new Error('Unable to determine current user for order lookup');
      }

      const response = await apiRequest(`/secure/orders/user/${userId}`, { method: 'GET' });
      const order = (response.data || []).find(
        (o) => String(o.order_id) === String(orderId)
      );

      if (!order) {
        return { success: false, message: 'Order not found', order: null };
      }

      return { success: true, order };
    } catch (error) {
      console.error('Get order by ID error:', error);
      return { success: false, message: error.message || 'Failed to fetch order details', order: null };
    }
  },

  // "Failed" orders are just orders from the same user-scoped list whose payment
  // didn't go through — there's no separate failed-orders table/endpoint.
  getUserFailedOrders: async (userId) => {
    try {
      const response = await apiRequest(`/secure/orders/user/${userId}`, { method: 'GET' });
      const data = (response.data || []).filter((o) =>
        ['failed', 'failed_stock_released'].includes(o.payment_status)
      );
      return { success: true, data, message: 'User failed orders retrieved successfully' };
    } catch (error) {
      console.error('Get user failed orders error:', error);
      throw new Error(error.message || 'Failed to get user failed orders');
    }
  },

  // Admin-wide failed-order listing has no backend equivalent (only used by the
  // unused FailedOrdersScreen.js "admin" branch).
  getFailedOrders: async () => notMigrated('Admin-wide failed order listing'),

  updateOrderStatus: async () => notMigrated('Updating order status'),
  cancelOrder: async () => notMigrated('Cancelling an order'),

  // These relied on atomic_inventory_release / cleanup_abandoned_payments_simple —
  // explicitly out of scope for this migration (no reservation step exists anymore
  // in the new single-step order-creation flow, see confirmRazorpayOrder above).
  restoreStockForAbandonedOrder: async () => notMigrated('Stock restoration for abandoned orders'),
  releaseStockForFailedOrder: async () => notMigrated('Stock release for failed orders'),
  cleanupAbandonedPaymentsDatabase: async () => notMigrated('Abandoned-payment database cleanup'),
};

// =============================================================================
// PAYMENTS
// =============================================================================
export const paymentAPI = {
  createRazorpayOrder: async (amount, receipt, notes = {}) => {
    try {
      const response = await apiRequest('/payments/create-razorpay-order', {
        method: 'POST',
        auth: false,
        body: { amount, receipt, notes },
      });
      return { success: true, order: response.order, message: response.message };
    } catch (error) {
      console.error('Create razorpay order error:', error);
      throw new Error(error.message || 'Failed to create Razorpay order');
    }
  },

  verifyRazorpayPayment: async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    try {
      const response = await apiRequest('/payments/verify-payment', {
        method: 'POST',
        auth: false,
        body: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      });
      return {
        success: true,
        payment_verified: response.payment_verified,
        payment_details: response.payment_details,
      };
    } catch (error) {
      console.error('Verify razorpay payment error:', error);
      throw new Error(error.message || 'Payment verification failed');
    }
  },

  // Old implementation wrote directly to bill_table via Supabase — there's no
  // equivalent "record a manual bill" endpoint on the new backend.
  processPayment: async () => notMigrated('Manual bill recording'),
  getPaymentHistory: async () => notMigrated('Payment history lookup'),
};

// =============================================================================
// QR
// =============================================================================
export const qrAPI = {
  generateQRData: async (tableNumber, restaurantId = 1) => {
    const qrData = {
      type: 'table_order',
      tableNumber,
      restaurantId,
      timestamp: getDatabaseTimestamp(),
    };
    return { success: true, data: JSON.stringify(qrData) };
  },

  generateKioskQRData: async (kioskId, kioskName = null) => {
    const qrData = {
      type: 'billing_kiosk',
      action: 'print_today_bills',
      kiosk_id: kioskId,
      kiosk_name: kioskName,
      timestamp: getDatabaseTimestamp(),
    };
    return { success: true, data: JSON.stringify(qrData) };
  },

  // 'table_order' QR codes are handled entirely client-side (no backend call needed).
  // 'billing_kiosk'/'bill_print' QR codes drive the print-job/kiosk workflow, which
  // is out of scope for this migration (see processBillingKioskScan below).
  scanQR: async (qrData, token, userData = null) => {
    try {
      const data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;

      if (data.type === 'table_order') {
        return {
          success: true,
          data: {
            type: 'table_order',
            tableNumber: data.tableNumber,
            restaurantId: data.restaurantId,
          },
        };
      }

      if (
        (data.type === 'billing_kiosk' || data.type === 'bill_print') &&
        (data.action === 'print_today_bills' || data.action === 'print_bills')
      ) {
        return await qrAPI.processBillingKioskScan(token, data.kiosk_id, userData);
      }

      throw new Error('Invalid QR code type: ' + (data.type || 'unknown'));
    } catch (error) {
      if (error.message && error.message.includes('JSON')) {
        throw new Error('Invalid QR code format - not a valid QR code');
      }
      throw new Error(error.message || 'Invalid QR code');
    }
  },

  processQRScan: async (qrData) => {
    const data = JSON.parse(qrData);
    if (data.type === 'table_order') {
      return {
        success: true,
        data: { type: 'table_order', tableNumber: data.tableNumber, restaurantId: data.restaurantId },
      };
    }
    throw new Error('Invalid QR code');
  },

  // Print-job/kiosk workflow — out of scope (no backend endpoints exist for
  // kiosk_machines / print_jobs).
  processBillingKioskScan: async () => notMigrated('Billing kiosk print workflow'),
  sendBillDataToKiosk: async () => notMigrated('Sending bill data to a kiosk'),
  getActiveKiosks: async () => notMigrated('Listing active kiosks'),
  getPendingPrintJobs: async () => notMigrated('Fetching pending print jobs'),
  updatePrintJobStatus: async () => notMigrated('Updating print job status'),
};

// =============================================================================
// STAFF
// =============================================================================
export const staffAPI = {
  createStaffOrder: async (orderData, _staffUserId) => {
    try {
      const response = await apiRequest('/staff/orders', {
        method: 'POST',
        body: {
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod || 'CASH',
          isParcel: orderData.isParcel || false,
          notes: orderData.notes || null,
          customerId: orderData.customerId || null,
        },
      });
      return { success: true, data: response.data, message: response.message };
    } catch (error) {
      console.error('Error creating staff order:', error);
      return { success: false, error: error.message || 'Failed to create staff order' };
    }
  },

  getTodayStatistics: async () => {
    try {
      const response = await apiRequest('/staff/stats/today', { method: 'GET' });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching today statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch statistics',
        data: { totalOrders: 0, totalRevenue: 0, upiCount: 0, upiAmount: 0, cashCount: 0, cashAmount: 0 },
      };
    }
  },

  getDishStatistics: async () => {
    try {
      const response = await apiRequest('/staff/stats/dishes', { method: 'GET' });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching dish statistics:', error);
      return { success: false, error: error.message || 'Failed to fetch dish statistics', data: [] };
    }
  },

  getStaffOrderHistory: async () => {
    try {
      const response = await apiRequest('/staff/orders/history', { method: 'GET' });
      const formattedOrders = (response.data || []).map((order) => ({
        ...order,
        order_items:
          order.order_items?.map((item) => ({
            ...item,
            dish_name: item.dish?.name || 'Unknown Dish',
          })) || [],
      }));
      return { success: true, data: formattedOrders };
    } catch (error) {
      console.error('Error fetching staff order history:', error);
      return { success: false, error: error.message || 'Failed to fetch order history', data: [] };
    }
  },
};

// =============================================================================
// TODAY'S SPECIAL
// =============================================================================
export const todaysSpecialAPI = {
  getCurrentSpecials: async () => {
    try {
      const response = await apiRequest('/todays-special/current', { auth: false });
      return { success: true, data: response.data || [] };
    } catch (error) {
      console.error('Error fetching today\'s specials:', error);
      return { success: false, error: error.message || 'Failed to fetch today\'s specials', data: [] };
    }
  },

  // Note: the backend endpoint only serves *today's* specials — the `date` param
  // (used historically to look up a specific past date) is not supported and is
  // ignored here.
  getSpecialsByMealType: async (mealType) => {
    try {
      const response = await apiRequest(`/todays-special/${mealType}`, { auth: false });
      return { success: true, data: response.data || [] };
    } catch (error) {
      console.error(`Error fetching ${mealType} specials:`, error);
      return { success: false, error: error.message || `Failed to fetch ${mealType} specials`, data: [] };
    }
  },

  uploadSpecial: async (mealType, imageUrl, displayOrder, userId) => {
    try {
      const response = await apiRequest('/todays-special', {
        method: 'POST',
        body: { mealType, imageUrl, displayOrder, userId },
      });
      return { success: true, data: response.data, message: response.message };
    } catch (error) {
      console.error('Error uploading today\'s special:', error);
      return { success: false, error: error.message || 'Failed to upload special' };
    }
  },

  deleteSpecial: async (specialId) => {
    try {
      const response = await apiRequest(`/todays-special/${specialId}`, { method: 'DELETE' });
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Error deleting today\'s special:', error);
      return { success: false, error: error.message || 'Failed to delete special' };
    }
  },

  resetSpecials: async () => {
    try {
      const response = await apiRequest('/todays-special/reset', { method: 'POST' });
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Error resetting today\'s specials:', error);
      return { success: false, error: error.message || 'Failed to reset specials' };
    }
  },
};

// =============================================================================
// DIAGNOSTICS (kept minimal — the old versions were all Supabase RLS/RPC
// permission probes that don't apply to this backend at all)
// =============================================================================
export const utilsAPI = {
  testConnection: async () => {
    try {
      await apiRequest('/menu/categories', { auth: false });
      return { success: true, message: 'Backend API connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  testDatabasePermissions: async () => ({
    success: false,
    error: 'Diagnostic not applicable to the REST backend',
  }),
  testSimplePrintJob: async () => ({
    success: false,
    error: 'Diagnostic not applicable to the REST backend',
  }),
  testSupabaseCompatibility: async () => ({
    success: false,
    error: 'Diagnostic not applicable to the REST backend',
  }),
};

export const debugAPI = utilsAPI;
