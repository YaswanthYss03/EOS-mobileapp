import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { UPI_APPS } from '../constants/config';

export class UPIPaymentService {
  // Generate UPI payment URL
  static generateUPIUrl(paymentData) {
    const { 
      vpa, // Virtual Payment Address (merchant UPI ID)
      amount, 
      transactionId, 
      merchantName = 'Canteen',
      note = 'Food Order Payment'
    } = paymentData;

    const upiUrl = `upi://pay?pa=${vpa}&am=${amount}&tid=${transactionId}&tn=${encodeURIComponent(note)}&pn=${encodeURIComponent(merchantName)}&cu=INR`;
    
    return upiUrl;
  }

  // Check if UPI app is installed
  static async isUPIAppInstalled(packageName) {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: `package:${packageName}`,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get available UPI apps
  static async getAvailableUPIApps() {
    if (Platform.OS !== 'android') {
      return [];
    }

    const availableApps = [];
    
    for (const app of UPI_APPS) {
      const isInstalled = await this.isUPIAppInstalled(app.package);
      if (isInstalled) {
        availableApps.push(app);
      }
    }

    return availableApps;
  }

  // Launch UPI payment with specific app
  static async launchUPIPayment(paymentData, selectedApp = null) {
    try {
      const upiUrl = this.generateUPIUrl(paymentData);

      if (Platform.OS === 'android' && selectedApp) {
        // Launch specific UPI app
        const intent = {
          action: 'android.intent.action.VIEW',
          data: upiUrl,
          package: selectedApp.package,
        };

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', intent);
      } else {
        // Launch default UPI handler or show app chooser
        const supported = await Linking.canOpenURL(upiUrl);
        
        if (supported) {
          await Linking.openURL(upiUrl);
        } else {
          throw new Error('No UPI apps found on device');
        }
      }

      return { success: true };
    } catch (error) {
      console.error('UPI Payment Launch Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Launch UPI payment with app chooser
  static async launchUPIPaymentWithChooser(paymentData) {
    try {
      const upiUrl = this.generateUPIUrl(paymentData);
      
      if (Platform.OS === 'android') {
        // Create intent with chooser
        const intent = {
          action: 'android.intent.action.VIEW',
          data: upiUrl,
          flags: 1, // FLAG_ACTIVITY_NEW_TASK
        };

        await IntentLauncher.startActivityAsync('android.intent.action.CHOOSER', {
          extra: {
            'android.intent.extra.INTENT': intent,
            'android.intent.extra.TITLE': 'Pay with UPI',
          },
        });
      } else {
        // For iOS, use Linking
        const supported = await Linking.canOpenURL(upiUrl);
        
        if (supported) {
          await Linking.openURL(upiUrl);
        } else {
          throw new Error('UPI payments not supported on iOS');
        }
      }

      return { success: true };
    } catch (error) {
      console.error('UPI Payment Chooser Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Validate UPI ID format
  static validateUPIId(upiId) {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    return upiRegex.test(upiId);
  }

  // Parse UPI response (if available)
  static parseUPIResponse(url) {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      return {
        status: params.get('Status') || 'UNKNOWN',
        txnId: params.get('txnId') || null,
        responseCode: params.get('responseCode') || null,
        txnRef: params.get('txnRef') || null,
      };
    } catch (error) {
      console.error('Error parsing UPI response:', error);
      return null;
    }
  }
}

export default UPIPaymentService;
