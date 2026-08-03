import { Alert } from 'react-native';
import { generateTransactionId } from '../utils/helpers';

export class SimplePaymentService {
  static async processPayment(paymentData) {
    const {
      amount,
      orderId,
      customerName = 'Customer',
      paymentMethod = 'cash',
      description = 'Food Order Payment',
    } = paymentData;

    return new Promise((resolve) => {
      if (paymentMethod === 'cash') {
        // Cash on Delivery
        Alert.alert(
          'Cash Payment',
          `Order Total: ₹${amount}\n\nPlease pay ₹${amount} in cash when you collect your order.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({
                success: false,
                error: 'Payment cancelled by user',
              }),
            },
            {
              text: 'Confirm Order',
              onPress: () => {
                const paymentId = `cash_${generateTransactionId()}`;
                resolve({
                  success: true,
                  paymentId,
                  orderId,
                  paymentMethod: 'cash',
                  data: {
                    payment_id: paymentId,
                    order_id: orderId,
                    method: 'cash',
                    status: 'pending',
                  },
                });
              },
            },
          ]
        );
      } else if (paymentMethod === 'online') {
        // Online Payment Simulation
        Alert.alert(
          'Online Payment',
          `Pay ₹${amount} online?\n\nThis will redirect to your payment app.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({
                success: false,
                error: 'Payment cancelled by user',
              }),
            },
            {
              text: 'Pay Now',
              onPress: () => {
                // Simulate payment processing
                setTimeout(() => {
                  const paymentId = `online_${generateTransactionId()}`;
                  resolve({
                    success: true,
                    paymentId,
                    orderId,
                    paymentMethod: 'online',
                    data: {
                      payment_id: paymentId,
                      order_id: orderId,
                      method: 'online',
                      status: 'completed',
                    },
                  });
                }, 2000);
              },
            },
          ]
        );
      } else {
        resolve({
          success: false,
          error: 'Invalid payment method',
        });
      }
    });
  }

  static async createUPIPaymentUrl(paymentData) {
    const {
      amount,
      merchantUPI = 'merchant@paytm', // Replace with your actual UPI ID
      merchantName = 'Amenity Services',
      transactionNote = 'Food Order Payment',
      transactionId,
    } = paymentData;

    // Generate UPI payment URL
    const upiUrl = `upi://pay?pa=${merchantUPI}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tid=${transactionId}`;
    
    return {
      success: true,
      paymentUrl: upiUrl,
      qrCodeData: upiUrl,
    };
  }
}

export default SimplePaymentService;
