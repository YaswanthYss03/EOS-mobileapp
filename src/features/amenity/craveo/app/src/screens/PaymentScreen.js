import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  createOrderStart,
  createOrderSuccess,
  createOrderFailure,
  setPaymentStatus,
} from '../redux/slices/orderSlice';
import { clearCart } from '../redux/slices/cartSlice';
import { refreshUserData } from '../redux/slices/authSlice';
import { useToast } from '../contexts/ToastContext';
import { orderAPI, paymentAPI } from '../services/api';
import UPIPaymentService from '../services/upiPayment';
import RazorpayService from '../services/razorpayService';
import SimplePaymentService from '../services/simplePaymentService';
import secureTimeService from '../services/secureTimeService';
import { RAZORPAY_KEY_ID, CURRENCY, COMPANY_NAME } from '../constants/razorpay';
import { formatCurrency, generateTransactionId, generateTokenNumber } from '../utils/helpers';
import { isAfter530PMIST } from '../utils/timezoneUtils';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { UPI_APPS, PAYMENT_STATUS, API_BASE_URL } from '../constants/config';
import PaymentVerificationAnimation from '../components/PaymentVerificationAnimation';

// import { EnhancedInventoryManager } from '../services/EnhancedInventoryManager'; // Disabled due to database function issues

import { menuAPI } from '../services/api';
import quantitySyncService from '../services/quantitySyncService';

// Stock validation utility
const validateCartStock = async (orderItems) => {
  try {
    console.log('🔍 Validating stock for', orderItems.length, 'items...');
    
    // Get current menu data
    const menuResponse = await menuAPI.getDishes();
    if (!menuResponse.success || !menuResponse.data) {
      return { valid: false, error: 'Unable to fetch current menu data' };
    }
    
    const currentDishes = menuResponse.data;
    const stockIssues = [];
    
    // Check each cart item against current stock
    for (const orderItem of orderItems) {
      const dishId = orderItem.dish?.dish_id || orderItem.dish_id || orderItem.id;
      const requiredQuantity = orderItem.quantity || 1;
      const dishName = orderItem.dish?.name || orderItem.name;
      
      // Find current stock for this dish
      const currentDish = currentDishes.find(dish => dish.dish_id === dishId);
      if (!currentDish) {
        stockIssues.push({
          name: dishName,
          issue: 'not_found',
          available: 0,
          required: requiredQuantity
        });
        continue;
      }
      
      const availableStock = currentDish.quantity || 0;
      if (availableStock < requiredQuantity) {
        stockIssues.push({
          name: dishName,
          issue: 'insufficient',
          available: availableStock,
          required: requiredQuantity
        });
      }
    }
    
    if (stockIssues.length > 0) {
      console.warn('⚠️ Stock validation failed:', stockIssues);
      return { 
        valid: false, 
        stockIssues,
        error: `Stock issues found with ${stockIssues.length} item(s)`
      };
    }
    
    console.log('✅ Stock validation passed for all items');
    return { valid: true };
    
  } catch (error) {
    console.error('❌ Stock validation error:', error);
    return { valid: false, error: 'Failed to validate stock: ' + error.message };
  }
};

const PaymentScreen = ({ navigation, route }) => {
  // Safely extract params with fallbacks
  const { 
    orderItems = [], 
    totalAmount = 0, 
    estimatedTime = 0,
    serverTime = null,
    codEnabled = false,
    extraCharges = {}
  } = route?.params || {};
  
  // Validate that orderItems is an array and has proper structure
  const validatedOrderItems = Array.isArray(orderItems) 
    ? orderItems.filter(item => item && (item.dish || item.name) && item.quantity)
    : [];

  // Debug logging to understand the data structure
  console.log('🎯 PaymentScreen received params:', {
    orderItemsLength: orderItems?.length,
    validatedItemsLength: validatedOrderItems.length,
    totalAmount,
    firstItem: validatedOrderItems[0] ? {
      dish_id: validatedOrderItems[0].dish?.dish_id || validatedOrderItems[0].dish_id || validatedOrderItems[0].id,
      dish_category_id: validatedOrderItems[0].dish?.dish_category_id || validatedOrderItems[0].dish?.category_id || validatedOrderItems[0].dish_category_id,
      category: validatedOrderItems[0].dish?.category,
      name: validatedOrderItems[0].dish?.name || validatedOrderItems[0].name,
      fullStructure: validatedOrderItems[0]
    } : 'No items'
  });
  
  console.log('🔍 PaymentScreen - Debug info:', {
    estimatedTime,
    firstItem: orderItems?.[0],
    firstValidItem: validatedOrderItems?.[0],
    firstItemStructure: orderItems?.[0] ? {
      hasQuantity: 'quantity' in orderItems[0],
      hasDish: 'dish' in orderItems[0],
      dishStructure: orderItems[0].dish ? Object.keys(orderItems[0].dish) : 'dish is undefined',
      itemKeys: Object.keys(orderItems[0])
    } : 'no first item'
  });

  // If no valid items, navigate back with error. useToast() is called here
  // (ahead of the other hooks below) because showError needs to exist before
  // this check runs - previously this referenced showError before its
  // declaration further down, which threw on any empty-cart navigation here.
  const { showSuccess, showError, showInfo } = useToast();

  if (validatedOrderItems.length === 0) {
    showError('Invalid cart data. Please try again.');
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  }
  
  // Calculate automatic parcel charges for Girls Hosteller after 5:30 PM
  const calculateTotalWithParcelCharges = () => {
    const { user } = useSelector(state => state.auth);
    let baseTotal = totalAmount;
    let parcelCharges = 0;
    let isParcelModeActive = false;
    
    // Check if Girls Hosteller and after 5:30 PM
    if (user?.user_type === 3) {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istOffset = 5.5; // IST is UTC+5:30
      const istTime = new Date(utcTime + (istOffset * 3600000));
      
      const currentHour = istTime.getHours();
      const currentMinute = istTime.getMinutes();
      const isAfter530PM = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);
      
      if (isAfter530PM) {
        isParcelModeActive = true;
        // Calculate ₹5 per item
        const totalItems = validatedOrderItems.reduce((sum, item) => sum + item.quantity, 0);
        parcelCharges = totalItems * 5;
        console.log(`📦 Auto-parcel charges for Girls Hosteller: ₹${parcelCharges} (${totalItems} items × ₹5)`);
      }
    }
    
    return {
      baseTotal,
      parcelCharges,
      finalTotal: baseTotal + parcelCharges,
      isParcelModeActive
    };
  };
  
  const { baseTotal, parcelCharges, finalTotal, isParcelModeActive } = calculateTotalWithParcelCharges();
  
  const [availableUPIApps, setAvailableUPIApps] = useState([]);
  const [selectedUPIApp, setSelectedUPIApp] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('razorpay'); // Default to razorpay
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [codEligible, setCodEligible] = useState(false);
  
  // isPaymentInProgressRef still gates payment-in-progress checks in the Razorpay
  // flow below. The old pendingOrderRef/appStateRef-based abandoned-order stock
  // restoration system (below) relied on a "reserve stock, pay later" order flow
  // that no longer exists — order creation is now a single atomic step (see
  // orderAPI.createCODOrder/confirmRazorpayOrder), so there is never a stale
  // reserved order left to clean up. That dead code (and its direct Supabase
  // queries) has been removed.
  const isPaymentInProgressRef = useRef(false);


  const dispatch = useDispatch();
  const { user, token } = useSelector(state => state.auth);
  const { paymentStatus } = useSelector(state => state.orders);

  // Activate ultra-fast sync during payment processing
  useEffect(() => {
    if (processingPayment) {
      console.log('💳 Payment processing started - activating checkout sync');
      quantitySyncService.activateCheckoutSync();
    } else {
      console.log('💳 Payment processing ended - returning to normal sync');
      quantitySyncService.activateNormalSync();
    }
    
    return () => {
      // Cleanup - return to normal sync when component unmounts
      quantitySyncService.activateNormalSync();
    };
  }, [processingPayment]);

  // Check COD eligibility using secure time service (consistent with CartScreen)
  const checkCODEligibility = async () => {
    console.log('🔍 PaymentScreen COD eligibility check - User data:', {
      user: user,
      userType: user?.user_type,
      token: token ? 'Present' : 'Missing',
      userId: user?.user_id || user?.id,
      isAuthenticated: user ? 'Yes' : 'No'
    });
    
    // If user exists but user_type is missing, try to refresh user data
    if (user && typeof user.user_type === 'undefined') {
      console.log('🔄 PaymentScreen: User data missing user_type, refreshing user data...');
      try {
        await dispatch(refreshUserData()).unwrap();
        console.log('✅ PaymentScreen: User data refreshed successfully');
        // Re-run the check with updated user data
        setTimeout(() => checkCODEligibility(), 1000);
        return;
      } catch (error) {
        console.error('❌ PaymentScreen: Failed to refresh user data:', error);
      }
    }
    
    if (!user) {
      console.log('🚫 PaymentScreen: No user data available');
      setCodEligible(false);
      return false;
    }
    
    if (user.user_type !== 3) {
      console.log('🚫 PaymentScreen: COD not available for user type:', user?.user_type, '(Only available for Girls Hosteller - type 3)');
      setCodEligible(false);
      return false;
    }

    try {
      const isCODAllowed = await secureTimeService.isCODEnabled(user.user_type);
      setCodEligible(isCODAllowed);
      
      console.log('🔒 PaymentScreen COD check:', {
        userType: user.user_type,
        userTypeName: user.user_type === 3 ? 'Girls Hosteller' : user.user_type === 2 ? 'Boys Hosteller' : 'Day Scholar',
        codAllowed: isCODAllowed,
        timeCheck: 'Server-based (secure)'
      });
      
      return isCODAllowed;
    } catch (error) {
      console.error('❌ PaymentScreen COD check failed:', error);
      setCodEligible(false);
      return false;
    }
  };

  useEffect(() => {
    checkAvailableUPIApps();
    
    // Use COD eligibility passed from CartScreen (already calculated with server time)
    console.log('🔒 PaymentScreen using COD eligibility from CartScreen:', {
      userType: user?.user_type,
      codEnabled,
      serverTime,
      timeCheck: 'Pre-calculated in CartScreen (secure)'
    });
    
    setCodEligible(codEnabled);
    
    // Set default payment method based on COD availability
    if (codEnabled && user?.user_type === 3) {
      setSelectedPaymentMethod('cod');
    } else {
      setSelectedPaymentMethod('razorpay');
    }
  }, [user, codEnabled]);

  // NOTE: This screen used to run an "abandoned order" cleanup system here —
  // a useFocusEffect that queried Supabase directly for stale PENDING_PAYMENT
  // orders, a navigation 'beforeRemove' listener, an AppState/focus/blur
  // monitoring effect, and a polling interval — all built around a
  // "reserve stock, then pay" order flow. That flow no longer exists: COD
  // orders are created (and stock decremented) atomically in one request
  // (orderAPI.createCODOrder), and Razorpay orders are only created, also
  // atomically, after payment is verified (orderAPI.confirmRazorpayOrder).
  // There is never a stale reserved/pending order left behind to clean up
  // anymore, so this whole subsystem (and its direct supabase.from('order_table')
  // queries) was dead code and has been removed rather than migrated.

  const checkAvailableUPIApps = async () => {
    try {
      const apps = await UPIPaymentService.getAvailableUPIApps();
      // Filter out invalid apps that don't have required properties
      const validApps = Array.isArray(apps) ? apps.filter(app => app && app.name && app.package) : [];
      console.log('📱 UPI Apps found:', { total: apps?.length || 0, valid: validApps.length });
      setAvailableUPIApps(validApps);
      if (validApps.length > 0) {
        setSelectedUPIApp(validApps[0]); // Select first available valid app by default
      }
    } catch (error) {
      console.log('Error checking UPI apps:', error);
      setAvailableUPIApps([]); // Set empty array on error
    }
  };

  const handlePayment = async () => {
    console.log('🎯 handlePayment called with method:', selectedPaymentMethod);
    
    if (selectedPaymentMethod === 'cod') {
      console.log('💰 Calling handleCODPayment');
      await handleCODPayment();
    } else if (selectedPaymentMethod === 'razorpay') {
      console.log('💳 Calling handleRazorpayPayment');
      await handleRazorpayPayment();
    } else {
      console.log('📱 Calling handleUPIPayment');
      await handleUPIPayment();
    }
  };

  // Handle COD payment (Cash on Delivery) - Using Regular Order API (avoiding database function issues)
  const handleCODPayment = async () => {
  setLoading(true);
  setProcessingPayment(true);
  
  try {
    console.log('💰 Starting COD payment with enhanced inventory management');

    // Step 0: Verify user ID
    const userId = user?.user_id || user?.id;
    console.log('👤 COD Payment - User ID:', userId);
    
    if (!userId) {
      throw new Error('User not found. Please login again.');
    }

    // Step 1: Prepare order items for enhanced inventory manager
    const orderItemsForAPI = validatedOrderItems.map((item) => {
      console.log(`📝 COD - Processing cart item:`, {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      });
      
      return {
        dish_id: item.id || item.dish?.dish_id || item.dish_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      };
    });

    // Step 2: Prepare order options
    const orderOptions = {
      isParcel: isParcelModeActive,
      deliveryRequired: false,
      paymentMethod: 'COD',
      estimatedTime: estimatedTime || 15,
      totalAmount: finalTotal,
      userType: user?.user_type || 1
    };

    console.log('📝 COD Order Details:', {
      userId,
      itemsCount: orderItemsForAPI.length,
      orderOptions,
      finalTotal
    });

    // Step 3: Create COD order using SECURE method with atomic stock validation
    dispatch(createOrderStart());
    console.log('� Creating SECURE COD order with stock validation');
    
    const orderResult = await orderAPI.createCODOrder(
      userId, 
      orderItemsForAPI, 
      orderOptions
    );
    
    console.log('📦 SECURE COD Order Result:', orderResult);
    
    if (!orderResult || !orderResult.data) {
      throw new Error('Failed to create secure COD order - no data returned');
    }

    console.log('✅ SECURE COD Order created successfully with stock validation');

    // Order successful
    dispatch(setPaymentStatus(PAYMENT_STATUS.SUCCESS));
    dispatch(createOrderSuccess(orderResult.data));
    dispatch(clearCart());
    
    // COD success - show toast and redirect immediately  
    const orderNumber = orderResult.data.order_id || 'N/A';
    const successMessage = `Order #${orderNumber} confirmed. Pay in cash when collecting your order.`;
    
    // Show success toast notification
    showSuccess(successMessage);
    
    // Navigate directly to Orders page
    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [
          { 
            name: 'Main', 
            params: { 
              screen: 'Orders'
            } 
          }
        ],
      });
    }, 1000);

  } catch (error) {
    console.error('❌ COD payment error:', error);
    dispatch(createOrderFailure(error.message));
    dispatch(setPaymentStatus(PAYMENT_STATUS.FAILED));
    
    // Handle specific error types for COD
    let userMessage = 'COD order failed. Please try again.';
    
    if (error.message?.includes('stock') || error.message?.includes('inventory')) {
      userMessage = 'Some items are out of stock. Please refresh and try again.';
      setTimeout(() => {
        navigation.navigate('Menu');
      }, 3000);
    } else if (error.message?.includes('User not found') || error.message?.includes('user')) {
      userMessage = 'User verification failed. Please login again.';
    } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
      userMessage = 'Network error. Please check your connection and try again.';
    } else {
      userMessage = error.message || 'COD order failed. Please try again.';
    }
    
    showError(userMessage);
  } finally {
    setLoading(false);
    setProcessingPayment(false);
  }
};

  const handleRazorpayPayment = async () => {
  console.log('🚀 Starting Razorpay payment with regular order API...');
  setLoading(true);
  setProcessingPayment(true);
  
  let orderResult = null;
  
  try {
    // Step 0: Validate configuration first
    const configValidation = RazorpayService.validateConfiguration();
    console.log('🔍 Razorpay Configuration validation:', configValidation);
    
    if (!configValidation.isValid) {
      throw new Error('Razorpay configuration is invalid. Please check your setup.');
    }
    
    console.log(`🔑 Using ${configValidation.mode} mode for payment`);

    // Step 0.1: Verify user
    const userId = user?.user_id || user?.id;
    console.log('👤 Razorpay Payment - User ID:', userId);
    
    if (!userId) {
      throw new Error('User not authenticated. Please login again.');
    }

    // Step 1: Prepare order items for enhanced inventory manager
    const orderItemsForAPI = validatedOrderItems.map((item, index) => {
      console.log(`📝 Razorpay - Processing cart item ${index}:`, {
        id: item.id,
        name: item.name,
        category: item.category,
        orderType: item.orderType || 'dine-in',
        price: item.price
      });
      
      return {
        dish_id: item.id || item.dish?.dish_id || item.dish_id,
        quantity: item.quantity,
        price: item.price || item.dish?.price,
        name: item.name,
        orderType: item.orderType || 'dine-in'
      };
    });

    // Step 2: Prepare order options
    const orderOptions = {
      isParcel: isParcelModeActive,
      deliveryRequired: false,
      paymentMethod: 'Razorpay',
      estimatedTime,
      totalAmount: finalTotal,
      userType: user?.user_type || 1
    };

    console.log('📞 Validating cart before opening payment gateway...');
    dispatch(createOrderStart());

    // Step 3: Validate stock/pricing up front (no order is created and no stock is
    // reserved yet — the backend's secure order-creation endpoint is single-step
    // and only runs once payment is verified, see confirmRazorpayOrder below).
    orderResult = await orderAPI.createRazorpayPendingOrder(
      userId,
      orderItemsForAPI,
      orderOptions
    );

    console.log('📦 Cart validation result:', orderResult);

    if (!orderResult || !orderResult.data) {
      // If validation failed, navigate back to menu to refresh inventory
      setTimeout(() => {
        navigation.navigate('Menu');
      }, 3000);
      throw new Error(orderResult?.error || 'Failed to validate cart');
    }

    // Nothing is reserved before payment succeeds, so there's nothing to track for
    // abandonment cleanup in this flow — isPaymentInProgressRef is still used to
    // gate the AppState/focus listeners further down.
    isPaymentInProgressRef.current = true;

    // Step 4: Create Razorpay order using backend API with network diagnostics
    console.log('🎯 Creating Razorpay order via backend API with network auto-discovery...');
    
    // Step 4: Create Razorpay order using backend API
    console.log('🎯 Creating Razorpay order via backend API...');
    
    let razorpayOrderData;
    let razorpayResult;
    
    const receiptId = `receipt_${Date.now()}_${userId}`;

    try {
      const razorpayOrderResponse = await fetch(`${API_BASE_URL}/payments/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalTotal,
          receipt: receiptId,
          notes: {
            user_id: userId,
            items_count: validatedOrderItems.length,
            user_type: user?.user_type || 'unknown'
          }
        }),
      });

      if (!razorpayOrderResponse.ok) {
        throw new Error(`Failed to create Razorpay order: ${razorpayOrderResponse.status}`);
      }

      razorpayOrderData = await razorpayOrderResponse.json();
      
      if (!razorpayOrderData.success || !razorpayOrderData.order) {
        throw new Error(razorpayOrderData.error || 'Failed to create Razorpay order');
      }

      console.log('✅ Razorpay order created successfully:', {
        order_id: razorpayOrderData.order.id,
        amount: razorpayOrderData.order.amount,
        currency: razorpayOrderData.order.currency
      });

      // Step 5: Launch Razorpay payment with real order ID
      const paymentData = {
        amount: finalTotal,
        orderId: razorpayOrderData.order.id, // Use real Razorpay order ID
        customerName: user?.name || user?.username || 'Customer',
        description: `Food Order - ${validatedOrderItems.length} items`,
      };

      console.log('🚀 Launching Razorpay payment with real order ID:', paymentData);
      
      // Show payment initiation message
      showSuccess(`Initiating ${configValidation.mode} payment... Opening payment gateway`);
      
      razorpayResult = await RazorpayService.initiatePayment(paymentData);
    
    } catch (orderCreationError) {
      console.error('❌ Error creating Razorpay order:', orderCreationError);
      
      // Handle specific order creation errors
      let errorMessage = 'Failed to create payment order. Please try again.';
      
      if (orderCreationError.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (orderCreationError.message?.includes('500')) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else if (orderCreationError.message?.includes('400')) {
        errorMessage = 'Invalid payment details. Please try again.';
      }
      
      showError(errorMessage);
      // Nothing was reserved yet at this point (no order/stock exists until payment
      // is confirmed below), so there's nothing to restore — just stop here.
      return;
    }

    // Continue with payment processing outside of try-catch
    console.log('💳 Razorpay payment result:', JSON.stringify(razorpayResult, null, 2));

    // CRITICAL: Immediate check for payment abandonment
    // Many users exit during the payment flow, so check immediately
    if (!razorpayResult.success) {
      console.log('🚨 Payment was not successful — no order was created and no stock was touched');
      console.log('📋 Razorpay result details:', {
        success: razorpayResult.success,
        cancelled: razorpayResult.cancelled,
        error: razorpayResult.error,
        paymentId: razorpayResult.paymentId,
        code: razorpayResult.code
      });

      isPaymentInProgressRef.current = false;

      // Show a simple, user-friendly toast based on the type of failure. None
      // of these are raw error/exception text - always one of these fixed,
      // plain messages, with a toast type that matches what actually happened
      // (cancelling isn't an "error", a network/timeout issue is).
      let toastMessage = 'Payment was not completed. No charge was made.';
      let isError = false;

      if (razorpayResult.cancelled ||
          (razorpayResult.error && razorpayResult.error.toLowerCase().includes('cancel'))) {
        toastMessage = 'Payment cancelled. No charge was made.';
      } else if (razorpayResult.error) {
        if (razorpayResult.error.toLowerCase().includes('network')) {
          toastMessage = 'Network error during payment. No charge was made.';
          isError = true;
        } else if (razorpayResult.error.toLowerCase().includes('timeout')) {
          toastMessage = 'Payment timed out. No charge was made.';
          isError = true;
        }
      }

      if (isError) {
        showError(toastMessage);
      } else {
        showInfo(toastMessage);
      }

      // Don't throw error - just return gracefully
      return;
    }

    if (razorpayResult.success) {
      // Step 5: order is created now, for the first time, with server-side payment
      // verification baked into the same request (see orderAPI.confirmRazorpayOrder).
      const paymentId = razorpayResult.paymentId || razorpayResult.data?.razorpay_payment_id;

      isPaymentInProgressRef.current = false;
      console.log('✅ Payment successful, creating the order with SECURE verification');
      try {
        const confirmationResult = await orderAPI.confirmRazorpayOrder(
          {
            userId,
            orderItems: orderItemsForAPI,
            totalAmount: finalTotal,
            options: orderOptions,
          },
          {
            payment_id: paymentId,
            razorpay_order_id: razorpayResult.orderId || razorpayOrderData.order.id,
            razorpay_signature: razorpayResult.signature,
          }
        );

        if (!confirmationResult.success) {
          throw new Error(confirmationResult.error || 'Order confirmation failed');
        }

        console.log('✅ Order created successfully with payment verification');

        // Update with the now-created order data
        orderResult.data = confirmationResult.data;
      } catch (confirmError) {
        console.error('❌ Failed to confirm order:', confirmError);
        throw new Error(`Order confirmation failed: ${confirmError.message}`);
      }

      // Success flow
      dispatch(setPaymentStatus(PAYMENT_STATUS.SUCCESS));
      dispatch(createOrderSuccess(orderResult.data));
      dispatch(clearCart());
      
      const orderNumber = orderResult.data.order_id || 'N/A';
      showSuccess(`Payment successful. Order #${orderNumber} placed.`);
      
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'Orders' } }],
        });
      }, 2000);

    } else {
      // Payment failed - handle with enhanced inventory manager
      const errorCode = razorpayResult.code || 'UNKNOWN';
      const errorMessage = razorpayResult.error || 'Payment failed';
      
      console.error('❌ Razorpay payment failed:', { errorCode, errorMessage });
      
      // Note: Do NOT update order_status to FAILED - it should remain PENDING
      // The payment_status will be updated to 'failed_stock_released' by the inventory manager
      console.log('🔄 Payment failed - inventory manager will handle stock restoration and status update');
      
      // Handle different error types
      let userMessage = 'Payment failed. Please try again.';
      
      if (errorCode === 'PAYMENT_CANCELLED') {
        userMessage = 'Payment was cancelled. Inventory has been restored.';
      } else if (errorCode === 'NETWORK_ERROR') {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (errorCode === 'CONFIG_ERROR') {
        userMessage = 'Payment service configuration error. Please contact support.';
      } else if (errorCode === 'RAZORPAY_SERVICE_ERROR') {
        userMessage = 'Razorpay service error. Please try again or use a different payment method.';
      } else {
        userMessage = `Payment failed: ${errorMessage}. Inventory has been restored.`;
      }
      
      throw new Error(userMessage);
    }

  } catch (error) {
    console.error('❌ Razorpay payment error:', error);
    
    // Note: under the current atomic flow, confirmRazorpayOrder only creates an
    // order once payment is already verified, so a caught error here means no
    // order was created at all — nothing to track or clean up.

    dispatch(createOrderFailure(error.message));
    dispatch(setPaymentStatus(PAYMENT_STATUS.FAILED));
    
    // Sanitize error message for user display
    let userMessage = 'Payment could not be completed. Please try again.';
    
    if (error.message) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('webbrowser') || errorMsg.includes('expo') || errorMsg.includes('call to function')) {
        userMessage = 'Payment gateway is temporarily unavailable. Please try again or contact support.';
      } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMsg.includes('cancelled') || errorMsg.includes('canceled')) {
        userMessage = 'Payment was cancelled. You can try again anytime.';
      } else if (!errorMsg.includes('technical') && !errorMsg.includes('function') && !errorMsg.includes('undefined')) {
        userMessage = error.message;
      }
    }
    
    showError(userMessage);
    
  } finally {
    setLoading(false);
    setProcessingPayment(false);
    // Ensure monitoring flags are cleared
    isPaymentInProgressRef.current = false;
  }
};

  const handleUPIPayment = async () => {
    if (!selectedUPIApp) {
      showError('Please select a UPI app first');
      return;
    }

    setLoading(true);
    setProcessingPayment(true);
    
    try {
      const paymentData = {
        amount: finalTotal,
        upiId: 'merchant@upi', // This should come from config
        merchantName: COMPANY_NAME,
        transactionId: generateTransactionId(),
        description: `Food Order - ${orderItems.length} items`,
      };

      const result = await UPIPaymentService.initiateUPIPayment(selectedUPIApp, paymentData);
      
      if (result.success) {
        // Handle successful payment
        dispatch(setPaymentStatus(PAYMENT_STATUS.SUCCESS));
        showSuccess('Your order has been placed.');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'Orders' } }],
          });
        }, 2000);
      } else {
        throw new Error(result.error || 'UPI payment failed');
      }
    } catch (error) {
      console.error('UPI Payment Error:', error);
      
      // User-friendly error messages for UPI
      let userMessage = 'UPI payment failed. Please try again.';
      
      if (error.message?.toLowerCase().includes('app not found') || 
          error.message?.toLowerCase().includes('app not installed')) {
        userMessage = 'UPI app not available. Please try a different payment method.';
      } else if (error.message?.toLowerCase().includes('cancelled') || 
                 error.message?.toLowerCase().includes('canceled')) {
        userMessage = 'UPI payment cancelled. You can try again.';
      } else if (error.message?.toLowerCase().includes('network') || 
                 error.message?.toLowerCase().includes('connection')) {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.toLowerCase().includes('timeout')) {
        userMessage = 'UPI request timed out. Please try again.';
      }
      
      showError(userMessage);
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  const renderOrderSummary = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.cardTitle}>Order Summary</Text>

      {validatedOrderItems.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>
              {item.dish?.name || item.dish?.dish_name || item.name || 'Unknown Item'}
            </Text>
            <Text style={styles.itemPrice}>
              {formatCurrency(item.dish?.price || item.price)} x {item.quantity}
            </Text>
          </View>
          <Text style={styles.itemTotal}>
            {formatCurrency((item.dish?.price || item.price) * item.quantity)}
          </Text>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Show subtotal if parcel charges are applied */}
      {isParcelModeActive && parcelCharges > 0 && (
        <>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalAmount}>
              {formatCurrency(baseTotal)}
            </Text>
          </View>

          <View style={styles.parcelChargesRow}>
            <Text style={styles.parcelChargesLabel}>
              Parcel Charges (Auto-applied after 5:30 PM)
            </Text>
            <Text style={styles.parcelChargesAmount}>
              {formatCurrency(parcelCharges)}
            </Text>
          </View>

          <View style={styles.divider} />
        </>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(finalTotal)}
        </Text>
      </View>

      {estimatedTime > 0 && (
        <View style={styles.estimatedTimePill}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={colors.primary} />
          <Text style={styles.estimatedTimeText}>
            Ready in ~{estimatedTime} min
          </Text>
        </View>
      )}
    </View>
  );

  // Card-style selectable rows (icon badge + title/description + radio check)
  // replacing Paper's List.Item, which was reading MD3's default purple theme
  // roles our theme override doesn't touch.
  const paymentMethodOptions = [
    {
      key: 'cod',
      icon: 'cash',
      iconColor: colors.success,
      title: 'Cash on Delivery',
      description: 'Pay in cash when you collect your order (Girls Hosteller, after 5:30 PM)',
      visible: codEligible && user && user.user_type === 3,
    },
    {
      key: 'razorpay',
      icon: 'credit-card-outline',
      iconColor: colors.primary,
      title: 'Pay using UPI apps',
      description: 'Credit/Debit Card, UPI, Net Banking, Wallets',
      visible: true,
    },
  ];

  const renderPaymentMethods = () => (
    <View style={styles.paymentCard}>
      <Text style={styles.cardTitle}>Choose Payment Method</Text>

      {paymentMethodOptions.filter(option => option.visible).map(option => {
        const selected = selectedPaymentMethod === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.methodRow, selected && styles.methodRowSelected]}
            onPress={() => setSelectedPaymentMethod(option.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIconWrap, { backgroundColor: `${option.iconColor}1A` }]}>
              <MaterialCommunityIcons name={option.icon} size={22} color={option.iconColor} />
            </View>
            <View style={styles.methodTextWrap}>
              <Text style={styles.methodTitle}>{option.title}</Text>
              <Text style={styles.methodDescription}>{option.description}</Text>
            </View>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
              {selected && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const isPaymentDisabled = () => {
    return loading || processingPayment || validatedOrderItems.length === 0;
  };

  const getPaymentButtonText = () => {
    if (processingPayment) return 'Processing...';
    
    switch (selectedPaymentMethod) {
      case 'cod':
        return `Place COD Order - ${formatCurrency(finalTotal)}`;
      case 'razorpay':
        return `Pay ${formatCurrency(finalTotal)}`;
      default:
        return `Pay ${formatCurrency(finalTotal)}`;
    }
  };

  if (loading && !processingPayment) {
    return (
      <View style={styles.loadingContainer}>
        <PaymentVerificationAnimation 
          size={100} 
          showScanningText={true} 
          scanningText="Initializing..." 
        />
        <Text style={styles.loadingText}>Preparing payment...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {renderOrderSummary()}
        {renderPaymentMethods()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, isPaymentDisabled() && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isPaymentDisabled()}
          activeOpacity={0.85}
        >
          {processingPayment ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.payButtonText}>{getPaymentButtonText()}</Text>
          )}
        </TouchableOpacity>
      </View>

      {processingPayment && (
        <View style={styles.processingOverlay}>
          <PaymentVerificationAnimation 
            size={80} 
            showScanningText={true} 
            scanningText="Processing..." 
          />
          <Text style={styles.processingText}>
            {selectedPaymentMethod === 'cod' 
              ? 'Placing your COD order...' 
              : 'Verifying payment details...'}
          </Text>
          {selectedPaymentMethod !== 'cod' && (
            <View style={styles.processingNoteContainer}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.white} />
              <Text style={styles.processingNote}>
                After successful payment, you will be{'\n'}redirected to your app automatically
              </Text>
            </View>
          )}
        </View>
      )}


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 60,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  paymentCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  subtotalLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  subtotalAmount: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  parcelChargesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  parcelChargesLabel: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  parcelChargesAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.accent,
    marginLeft: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  estimatedTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: `${colors.primary}12`,
  },
  estimatedTimeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  methodRowSelected: {
    backgroundColor: `${colors.primary}0D`,
    borderColor: colors.primary,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  methodTextWrap: {
    flex: 1,
  },
  methodTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  methodDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm + 2,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  payButtonDisabled: {
    backgroundColor: colors.gray,
    elevation: 0,
    shadowOpacity: 0,
  },
  payButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.white,
    textAlign: 'center',
    fontWeight: '600',
  },
  processingNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    maxWidth: '85%',
  },
  processingNote: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 20,
    flex: 1,
  },
});

export default PaymentScreen;
