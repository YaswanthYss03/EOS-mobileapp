import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { RAZORPAY_KEY_ID, COMPANY_NAME, CURRENCY } from '../constants/razorpay';
import { generateTransactionId } from '../utils/helpers';

// Try to import native Razorpay, fallback to null if not available
let RazorpayCheckout = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (error) {
  console.log('📱 Native Razorpay not available, will use web fallback');
}

export class RazorpayService {
  // Debug method to validate Razorpay configuration
  static validateConfiguration() {
    console.log('🔍 Validating Razorpay Configuration...');
    console.log('   Key ID:', RAZORPAY_KEY_ID);
    console.log('   Key Valid:', RAZORPAY_KEY_ID && RAZORPAY_KEY_ID.length > 0);
    console.log('   Mode:', RAZORPAY_KEY_ID?.includes('live') ? 'LIVE 🔴' : 'TEST 🧪');
    console.log('   Company:', COMPANY_NAME);
    console.log('   Currency:', CURRENCY);
    console.log('   SDK Available:', !!RazorpayCheckout);
    
    return {
      isValid: !!(RAZORPAY_KEY_ID && COMPANY_NAME && CURRENCY),
      mode: RAZORPAY_KEY_ID?.includes('live') ? 'LIVE' : 'TEST',
      sdkAvailable: !!RazorpayCheckout
    };
  }

  static async initiatePayment(paymentData) {
    const {
      amount, // Amount in rupees
      orderId,
      customerName = 'Customer',
      description = 'Food Order Payment',
    } = paymentData;

    console.log('🔍 Payment initiation check:', {
      hasRazorpayCheckout: !!RazorpayCheckout,
      platform: Platform.OS,
      amount,
      orderId,
      keyId: RAZORPAY_KEY_ID,
      isTestMode: RAZORPAY_KEY_ID?.includes('test'),
      buildType: 'APK_BUILD' // Indicating this is for APK builds, not Expo Go
    });

    // Validate configuration first
    const configValidation = this.validateConfiguration();
    if (!configValidation.isValid) {
      return {
        success: false,
        error: 'Razorpay configuration is invalid. Check RAZORPAY_KEY_ID, COMPANY_NAME, and CURRENCY.',
        code: 'CONFIG_ERROR'
      };
    }

    // For APK builds, native module should work properly
    // Try native first, fallback to web if it fails
    try {
      if (RazorpayCheckout && Platform.OS !== 'web') {
        console.log('🚀 Attempting native Razorpay integration (APK build)');
        const nativeResult = await this.initiateNativePayment(paymentData);
        
        // If native payment fails due to SDK issues, fallback to web
        if (!nativeResult.success && (nativeResult.code === 'SDK_ERROR' || nativeResult.code === 'PAYMENT_FAILED' || nativeResult.code === 'RAZORPAY_SERVICE_ERROR')) {
          console.log('🌐 Native payment failed, falling back to web integration');
          return this.initiateWebPayment(paymentData);
        }
        
        return nativeResult;
      } else {
        console.log('🌐 Using web-based Razorpay integration');
        return this.initiateWebPayment(paymentData);
      }
    } catch (error) {
      console.error('❌ Native payment failed with error:', error);
      console.log('🌐 Falling back to web-based Razorpay integration');
      return this.initiateWebPayment(paymentData);
    }
  }

  static async initiateNativePayment(paymentData) {
    const {
      amount,
      orderId,
      customerName = 'Customer',
      description = 'Food Order Payment',
    } = paymentData;

    try {
      console.log('🚀 Initiating native Razorpay payment for amount:', amount);
      console.log('🔑 Using key:', RAZORPAY_KEY_ID);
      console.log('📱 RazorpayCheckout available:', !!RazorpayCheckout);
      
      if (!RazorpayCheckout) {
        throw new Error('Razorpay SDK not available. Please install react-native-razorpay.');
      }

      if (!RAZORPAY_KEY_ID) {
        throw new Error('Razorpay key not configured. Please check constants/razorpay.js');
      }

      const amountInPaise = Math.round(amount * 100);
      console.log('💰 Amount in rupees:', amount, 'Amount in paise:', amountInPaise);
      console.log('🎯 Using Razorpay order ID:', orderId);
      
      const options = {
        description: description,
        currency: CURRENCY,
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise, // Convert to paise
        order_id: orderId, // Real Razorpay order ID from backend
        name: COMPANY_NAME,
        prefill: {
          name: customerName
        },
        theme: {
          color: '#528FF0' // Use Razorpay's default blue color
        },
        notes: {
          app_order_id: orderId,
          merchant: COMPANY_NAME
        }
      };

      console.log('💰 Payment options with order_id:', JSON.stringify(options, null, 2));

      // For LIVE mode, ensure we have minimal required fields
      if (RAZORPAY_KEY_ID.includes('live')) {
        console.log(`🔴 LIVE MODE: Initiating payment for ₹${amount} with key: ${RAZORPAY_KEY_ID.substring(0, 12)}...`);
        console.log('⚠️ WARNING: LIVE mode requires activated Razorpay account with KYC verification');
      } else {
        console.log(`🧪 TEST MODE: Initiating payment for ₹${amount} with key: ${RAZORPAY_KEY_ID.substring(0, 12)}...`);
      }
      
      console.log('💰 Payment options (simplified):', JSON.stringify(options, null, 2));

      // Open native Razorpay checkout with simplified options
      console.log('🚀 Opening Razorpay checkout...');
      const data = await RazorpayCheckout.open(options);
      
      console.log('✅ Payment successful:', JSON.stringify(data, null, 2));
      
      return {
        success: true,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id || orderId,
        signature: data.razorpay_signature,
        data: data,
      };
      
    } catch (error) {
      console.error('❌ Razorpay payment error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Handle different error types
      if (error.code === 'Cancelled' || error.message?.includes('cancelled')) {
        return {
          success: false,
          error: 'Payment was cancelled by user',
          code: 'PAYMENT_CANCELLED',
          data: error,
        };
      } else if (error.code === 'NetworkError' || error.message?.includes('network')) {
        return {
          success: false,
          error: 'Network error. Please check your internet connection.',
          code: 'NETWORK_ERROR',
          data: error,
        };
      } else if (error.message?.includes('not available') || error.message?.includes('SDK')) {
        return {
          success: false,
          error: 'Payment service temporarily unavailable. Please try again.',
          code: 'SDK_ERROR',
          data: error,
        };
      } else if (error.message?.includes('Something went wrong') || error.description?.includes('Something went wrong')) {
        return {
          success: false,
          error: 'Razorpay service error. This may be due to account configuration issues. Please try TEST mode first.',
          code: 'RAZORPAY_SERVICE_ERROR',
          data: error,
        };
      } else if (error.code === 'BAD_REQUEST_ERROR' || error.message?.includes('BAD_REQUEST')) {
        return {
          success: false,
          error: 'Invalid payment configuration. Please check Razorpay account settings.',
          code: 'BAD_REQUEST_ERROR',
          data: error,
        };
      } else {
        return {
          success: false,
          error: error.description || error.message || 'Payment failed. Please try again.',
          code: error.code || 'PAYMENT_FAILED',
          data: error,
        };
      }
    }
  }

  static async initiateWebPayment(paymentData) {
    const {
      amount,
      orderId,
      customerName = 'Customer',
      description = 'Food Order Payment',
    } = paymentData;

    try {
      console.log('🌐 Initiating web Razorpay payment for amount:', amount);
      
      // Create HTML content with embedded Razorpay checkout
      const paymentHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Razorpay Payment</title>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 15px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 40px;
              text-align: center;
              max-width: 400px;
              width: 100%;
            }
            .logo { color: #235EAA; font-size: 2.5em; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; font-size: 1.8em; }
            .amount { color: #235EAA; font-size: 2em; font-weight: bold; margin: 20px 0; }
            .details { color: #666; margin-bottom: 30px; line-height: 1.6; }
            .pay-btn {
              background: linear-gradient(135deg, #235EAA 0%, #F7931E 100%);
              border: none;
              color: white;
              padding: 15px 40px;
              border-radius: 25px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              transition: transform 0.2s;
              box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
            }
            .pay-btn:hover { transform: translateY(-2px); }
            .pay-btn:active { transform: translateY(0); }
            .footer { margin-top: 30px; font-size: 12px; color: #999; }
            .loading { display: none; margin-top: 20px; color: #235EAA; }
            .status { margin-top: 20px; padding: 10px; border-radius: 5px; }
            .success { background: #d4edda; color: #155724; }
            .error { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🍽️</div>
            <h1>${COMPANY_NAME}</h1>
            <div class="amount">₹${amount}</div>
            <div class="details">
              <strong>Order:</strong> ${orderId}<br>
              <strong>Customer:</strong> ${customerName}<br>
              <strong>Description:</strong> ${description}
            </div>
            <button class="pay-btn" onclick="initiateRazorpayPayment()">
              Pay with Razorpay
            </button>
            <div class="loading" id="loading">Processing payment...</div>
            <div id="status"></div>
            <div class="footer">🔒 Secure payment powered by Razorpay • Test Mode</div>
          </div>

          <script>
            let paymentInProgress = false;
            
            function showStatus(message, type = 'info') {
              const status = document.getElementById('status');
              status.innerHTML = message;
              status.className = 'status ' + type;
              status.style.display = 'block';
            }
            
            function initiateRazorpayPayment() {
              if (paymentInProgress) return;
              
              paymentInProgress = true;
              document.querySelector('.pay-btn').style.display = 'none';
              document.getElementById('loading').style.display = 'block';
              
              const options = {
                key: '${RAZORPAY_KEY_ID}',
                amount: ${Math.round(amount * 100)}, // Amount in paise
                currency: '${CURRENCY}',
                name: '${COMPANY_NAME}',
                description: '${description}',
                order_id: '${orderId}',
                prefill: {
                  name: '${customerName}'
                },
                theme: {
                  color: '#235EAA'
                },
                handler: function(response) {
                  console.log('✅ Payment Success:', response);
                  showStatus('Payment Successful! Payment ID: ' + response.razorpay_payment_id, 'success');
                  
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                },
                modal: {
                  ondismiss: function() {
                    console.log('❌ Payment dismissed');
                    paymentInProgress = false;
                    showStatus('Payment cancelled by user', 'error');
                    
                    document.querySelector('.pay-btn').style.display = 'block';
                    document.getElementById('loading').style.display = 'none';
                    
                    setTimeout(() => {
                      window.close();
                    }, 2000);
                  }
                }
              };

              // Check if Razorpay is loaded
              if (typeof Razorpay === 'undefined') {
                showStatus('Razorpay script not loaded. Please check your internet connection.', 'error');
                paymentInProgress = false;
                document.querySelector('.pay-btn').style.display = 'block';
                document.getElementById('loading').style.display = 'none';
                return;
              }

              try {
                const rzp = new Razorpay(options);
                rzp.open();
              } catch (error) {
                console.error('❌ Razorpay initialization error:', error);
                showStatus('Failed to initialize payment: ' + error.message, 'error');
                paymentInProgress = false;
                document.querySelector('.pay-btn').style.display = 'block';
                document.getElementById('loading').style.display = 'none';
              }
            }

            // Auto-start payment after page loads
            window.onload = function() {
              setTimeout(initiateRazorpayPayment, 1500);
            };
          </script>
        </body>
        </html>
      `;

      // Create data URI for the HTML content
      const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(paymentHTML)}`;
      
      console.log('🌐 Opening Razorpay payment page...');
      
      // Open with WebBrowser for better control
      const result = await WebBrowser.openBrowserAsync(dataUri, {
        toolbarColor: '#235EAA',
        controlsColor: '#FFFFFF',
        showTitle: true,
        enableBarCollapsing: false,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        browserPackage: undefined,
        createTask: false,
      });

      console.log('📱 Browser closed with result:', result);

      // For web mode, we prompt user for payment status
      return new Promise((resolve) => {
        setTimeout(() => {
          Alert.alert(
            'Payment Status',
            'Did you complete the payment successfully?',
            [
              {
                text: 'Payment Failed',
                style: 'destructive',
                onPress: () => {
                  console.log('❌ User indicated payment failed');
                  resolve({
                    success: false,
                    error: 'Payment failed or was cancelled by user',
                  });
                },
              },
              {
                text: 'Payment Successful',
                style: 'default',
                onPress: () => {
                  const paymentId = `pay_${generateTransactionId()}`;
                  console.log('✅ User confirmed payment success:', paymentId);
                  resolve({
                    success: true,
                    paymentId,
                    orderId,
                    signature: `sig_${generateTransactionId()}`,
                    data: {
                      razorpay_payment_id: paymentId,
                      razorpay_order_id: orderId,
                      razorpay_signature: `sig_${generateTransactionId()}`,
                    },
                  });
                },
              },
            ],
            { cancelable: false }
          );
        }, 1000);
      });
      
    } catch (error) {
      console.error('❌ Web payment error:', error);
      
      // Convert technical errors to user-friendly messages
      let userFriendlyMessage = 'Payment could not be processed at this time.';
      
      if (error.message && error.message.includes('WebBrowser')) {
        userFriendlyMessage = 'Unable to open payment gateway. Please try again or use a different payment method.';
      } else if (error.message && error.message.includes('openBrowserAsync')) {
        userFriendlyMessage = 'Payment gateway is temporarily unavailable. Please try again later.';
      } else if (error.message && error.message.includes('network')) {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.description) {
        userFriendlyMessage = error.description;
      } else if (error.message && !error.message.includes('Expo') && !error.message.includes('Call to function')) {
        userFriendlyMessage = error.message;
      }
      
      return {
        success: false,
        error: userFriendlyMessage,
        code: error.code,
        data: error,
      };
    }
  }

  /**
   * @deprecated This method is no longer used. Order creation is now handled by the backend API
   * at /api/payments/create-razorpay-order which uses the official Razorpay SDK with auto-capture.
   * This method was creating mock order IDs which prevented auto-capture functionality.
   */
  static async createRazorpayOrder(orderData) {
    const {
      amount,
      receipt,
      notes = {},
    } = orderData;

    try {
      const isLiveMode = RAZORPAY_KEY_ID.includes('live');
      
      if (isLiveMode) {
        console.log('🔴 LIVE MODE: Creating production-ready order...');
        
        // In LIVE mode, create a more realistic order ID
        // Format: order_YYYYMMDD_HHMMSS_RANDOM
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:T]/g, '').substr(0, 15);
        const random = Math.random().toString(36).substr(2, 6);
        const orderId = `order_${timestamp}_${random}`;
        
        console.log('📝 Created LIVE Razorpay order:', orderId);
        console.log('💰 Order amount:', amount, 'INR (', Math.round(amount * 100), 'paise)');
        console.log('🧾 Receipt:', receipt);
        console.log('📝 Notes:', notes);
        
        return {
          success: true,
          orderId,
          amount: Math.round(amount * 100), // Convert to paise
          currency: CURRENCY,
          receipt,
          notes: {
            ...notes,
            created_at: new Date().toISOString(),
            mode: 'LIVE',
            sdk_version: 'react-native'
          },
        };
      } else {
        // Test mode - simple order ID
        const orderId = `order_test_${generateTransactionId()}`;
        
        console.log('🧪 Created TEST Razorpay order:', orderId);
        
        return {
          success: true,
          orderId,
          amount: Math.round(amount * 100), // Convert to paise
          currency: CURRENCY,
          receipt,
          notes: {
            ...notes,
            mode: 'TEST'
          },
        };
      }
    } catch (error) {
      console.error('❌ Failed to create Razorpay order:', error);
      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }
  }

  static formatAmount(amount) {
    return Math.round(amount * 100); // Convert rupees to paise
  }

  static parseAmount(amountInPaise) {
    return amountInPaise / 100; // Convert paise to rupees
  }
}

export default RazorpayService;
