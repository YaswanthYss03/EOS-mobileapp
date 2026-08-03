/**
 * Enhanced Mobile App Inventory Management
 *
 * NOTE: This class is not currently imported anywhere in the app (PaymentScreen.js
 * has a commented-out import — "Disabled due to database function issues"). It
 * originally implemented a two-phase "reserve stock via RPC, then create the
 * order, then confirm/release the reservation" flow on top of direct Supabase
 * table access and two Postgres RPCs (atomic_inventory_check_and_reserve /
 * atomic_inventory_release).
 *
 * The REST backend (Restaurent_App/backend) does not expose those RPCs, or any
 * equivalent reservation mechanism — order creation there is a single atomic
 * step instead (see src/services/backendAPI.js's orderAPI.createCODOrder /
 * orderAPI.confirmRazorpayOrder, which decrement stock and create the order in
 * one transaction server-side). Methods below that depended on the reservation
 * RPCs have no backend equivalent and are left as clearly-labeled stubs that
 * throw rather than silently doing nothing or hitting a database the app can no
 * longer reach. The two read-only methods (getInventoryStatus/validateCartItems)
 * DO have a real equivalent — the /menu/dishes endpoint via menuAPI — so those
 * have been genuinely migrated instead of stubbed.
 */
import { menuAPI } from './api';

const notMigrated = (feature) => {
  throw new Error(
    `EnhancedInventoryManager.${feature} is not yet migrated to the backend API. ` +
    `This relied on a Supabase RPC (atomic_inventory_check_and_reserve / atomic_inventory_release) ` +
    `that the new REST backend does not expose — order creation is now a single atomic step, ` +
    `see orderAPI.createCODOrder / orderAPI.confirmRazorpayOrder in services/backendAPI.js instead.`
  );
};

export class EnhancedInventoryManager {

  /**
   * Create order with atomic inventory validation (Issue 1 fix)
   * Superseded by orderAPI.createCODOrder / orderAPI.confirmRazorpayOrder, which
   * perform the equivalent validation+creation atomically server-side over REST.
   */
  static async createOrderWithAtomicInventory(_userId, _orderItems, _orderOptions = {}) {
    notMigrated('createOrderWithAtomicInventory');
  }

  /**
   * Handle payment success and finalize order (Issue 2 fix)
   * Superseded by orderAPI.confirmRazorpayOrder, which verifies payment and
   * creates the order in one backend request.
   */
  static async handlePaymentSuccess(_orderId, _transactionId, _userType, _paymentMethod) {
    notMigrated('handlePaymentSuccess');
  }

  /**
   * Handle payment failure and release inventory (Issue 2 fix)
   * No backend equivalent — under the new atomic order-creation flow, a failed
   * payment never reserved stock in the first place, so there's nothing to release.
   */
  static async handlePaymentFailure(_orderId, _reason = 'Payment failed') {
    notMigrated('handlePaymentFailure');
  }

  /**
   * Release inventory reservation (used for payment failures or order cancellation)
   * No backend equivalent (atomic_inventory_release RPC does not exist over REST).
   */
  static async releaseInventoryReservation(_items) {
    notMigrated('releaseInventoryReservation');
  }

  /**
   * Get real-time inventory status for menu display.
   * Migrated to use GET /menu/dishes (via menuAPI) instead of a direct
   * `supabase.from('dishes')` query — same read-only data, real backend endpoint.
   */
  static async getInventoryStatus(dishIds = null) {
    try {
      const response = await menuAPI.getDishes();
      if (!response.success || !response.data) {
        return { success: false, error: 'Unable to fetch current menu data' };
      }

      let dishes = response.data;
      if (dishIds && dishIds.length > 0) {
        dishes = dishes.filter((dish) => dishIds.includes(dish.dish_id));
      }

      const inventoryStatus = dishes.map((dish) => ({
        dish_id: dish.dish_id,
        name: dish.name,
        price: parseFloat(dish.price),
        quantity: dish.quantity,
        available: dish.quantity > 0,
        stock_status: dish.quantity > 10 ? 'good' : dish.quantity > 0 ? 'low' : 'out_of_stock',
        category: dish.category?.dish_category_name || dish.category || 'Uncategorized',
      }));

      return {
        success: true,
        dishes: inventoryStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Get inventory status error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate cart items before checkout.
   * Migrated to use getInventoryStatus (above), which itself now goes through
   * menuAPI.getDishes() instead of a direct Supabase query.
   */
  static async validateCartItems(cartItems) {
    try {
      const validation = await this.getInventoryStatus(cartItems.map((item) => item.dish_id));

      if (!validation.success) {
        return validation;
      }

      const validatedItems = cartItems.map((cartItem) => {
        const dishInfo = validation.dishes.find((dish) => dish.dish_id === cartItem.dish_id);

        if (!dishInfo) {
          return {
            ...cartItem,
            available: false,
            message: 'Dish not found',
          };
        }

        const isAvailable = dishInfo.quantity >= cartItem.quantity;

        return {
          ...cartItem,
          available: isAvailable,
          current_stock: dishInfo.quantity,
          message: isAvailable ? 'Available' : `Only ${dishInfo.quantity} available`,
          price: dishInfo.price,
        };
      });

      const allAvailable = validatedItems.every((item) => item.available);
      const totalAmount = validatedItems
        .filter((item) => item.available)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);

      return {
        success: true,
        all_available: allAvailable,
        items: validatedItems,
        total_amount: totalAmount,
      };
    } catch (error) {
      console.error('❌ Validate cart items error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default EnhancedInventoryManager;
