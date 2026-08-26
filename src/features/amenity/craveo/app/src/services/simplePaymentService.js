import { generateTransactionId } from '../utils/helpers';
import { confirm } from '../../../../../../utils/confirm';

export class SimplePaymentService {
  static async processPayment(paymentData) {
    const {
      amount,
      orderId,
      customerName = 'Customer',
      paymentMethod = 'cash',
      description = 'Food Order Payment',
    } = paymentData;

    if (paymentMethod === 'cash') {
      // Cash on Delivery
      const ok = await confirm({
        title: 'Cash Payment',
        message: `Order Total: ₹${amount}\n\nPlease pay ₹${amount} in cash when you collect your order.`,
        confirmText: 'Confirm Order',
      });
      if (!ok) {
        return { success: false, error: 'Payment cancelled by user' };
      }
      const paymentId = `cash_${generateTransactionId()}`;
      return {
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
      };
    } else if (paymentMethod === 'online') {
      // Online Payment Simulation
      const ok = await confirm({
        title: 'Online Payment',
        message: `Pay ₹${amount} online?\n\nThis will redirect to your payment app.`,
        confirmText: 'Pay Now',
      });
      if (!ok) {
        return { success: false, error: 'Payment cancelled by user' };
      }
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const paymentId = `online_${generateTransactionId()}`;
      return {
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
      };
    }

    return { success: false, error: 'Invalid payment method' };
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
