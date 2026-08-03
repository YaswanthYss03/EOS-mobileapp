import { menuAPI } from './index';
import { store } from '../redux/store';
import { updateDishRealtime } from '../redux/slices/menuSlice';
import { updateCartItemStock, validateCartStock } from '../redux/slices/cartSlice';

class QuantitySyncService {
  constructor() {
    this.syncInterval = null;
    this.lastSync = null;
    this.syncFrequency = 5000; // 5 seconds
    this.isActive = false;
    this.dishQuantities = new Map(); // Cache current quantities
    this.dispatchFunction = null; // Store dispatch function
    this.retryCount = 0; // Track retry attempts
    this.maxRetries = 10; // Maximum retry attempts
    this.syncCount = 0; // Track number of syncs for periodic operations
  }

  /**
   * Set the Redux dispatch function
   */
  setDispatch(dispatch) {
    this.dispatchFunction = dispatch;
    console.log('✅ Redux dispatch function registered');
  }

  /**
   * Check if Redux store has dishes data
   */
  isStoreReady() {
    try {
      if (store && store.getState) {
        const state = store.getState();
        const menuState = state.menu;
        
        // Reduce logging frequency - only log occasionally
        if (Math.random() < 0.05) { // Only 5% of the time
          console.log('🔍 Checking store readiness:', {
            hasStore: !!store,
            hasMenuState: !!menuState,
            hasDishes: !!(menuState && menuState.dishes),
            dishesIsArray: !!(menuState && Array.isArray(menuState.dishes)),
            dishesLength: menuState && menuState.dishes ? menuState.dishes.length : 0,
            menuLoading: menuState ? menuState.loading : 'unknown'
          });
        }
        
        const isReady = menuState && 
                       Array.isArray(menuState.dishes) && 
                       menuState.dishes.length > 0 &&
                       !menuState.loading;
        
        // Reduce status logging frequency
        if (Math.random() < 0.1) { // Only 10% of the time
          console.log(`📊 Store ready status: ${isReady ? '✅ Ready' : '⏳ Not ready'}`);
        }
        return isReady;
      }
      
      console.log('❌ Store or getState method not available');
      return false;
    } catch (error) {
      console.error('❌ Error checking store state:', error);
      return false;
    }
  }

  /**
   * Start background quantity sync
   */
  startSync() {
    if (this.isActive) {
      console.log('⚡ Quantity sync already active');
      return;
    }

    // Check if store is ready before starting
    const storeReady = this.isStoreReady();
    
    if (!storeReady) {
      this.retryCount++;
      
      if (this.retryCount <= this.maxRetries) {
        console.log(`⏳ Store not ready, delaying sync start... (attempt ${this.retryCount}/${this.maxRetries})`);
        
        // For first few attempts, wait longer. For later attempts, start anyway
        if (this.retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000);
          
          setTimeout(() => {
            if (!this.isActive) {
              this.startSync();
            }
          }, delay);
          return;
        } else {
          console.log(`🚀 Starting sync anyway after ${this.retryCount} attempts (store will be checked during operation)`);
        }
      } else {
        console.error('❌ Max retries reached, starting sync anyway');
        this.retryCount = 0; // Reset for future attempts
      }
    }

    // Reset retry count on successful start or forced start
    this.retryCount = 0;
    this.forceStartSync();
  }

  /**
   * Force start sync regardless of store state
   */
  forceStartSync() {
    console.log('🚀 Starting real-time quantity sync service...');
    this.isActive = true;
    
    // Initial sync to populate cache
    this.performSync();
    
    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.syncFrequency);

    console.log(`✅ Quantity sync started (every ${this.syncFrequency/1000}s)`);
  }

  /**
   * Stop background quantity sync
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isActive = false;
    console.log('🛑 Quantity sync stopped');
  }

  /**
   * Perform a single sync operation
   */
  async performSync() {
    try {
      // Fetch latest dish data from billing software API
      const response = await menuAPI.getDishes();
      
      if (response && response.success && response.data) {
        const dishes = Array.isArray(response.data) ? response.data : [];
        
        if (dishes.length > 0) {
          // Increment sync counter
          this.syncCount++;
          
          // Check if Redux store is empty but we have data - populate it
          if (!this.isStoreReady() && this.dispatchFunction) {
            console.log('🔄 Redux store empty but API has data - populating store...');
            try {
              const { fetchMenuSuccess } = require('../redux/slices/menuSlice');
              this.dispatchFunction(fetchMenuSuccess({
                dishes: dishes,
                inventoryAvailable: true
              }));
              console.log(`✅ Populated Redux store with ${dishes.length} dishes from sync`);
            } catch (error) {
              console.error('❌ Error populating Redux store from sync:', error);
            }
          }
          
          this.checkForQuantityChanges(dishes);
          this.lastSync = new Date().toISOString();
        } else {
          console.warn('⚠️ No dishes received from API');
        }
      } else {
        console.warn('⚠️ API response unsuccessful:', response);
      }
    } catch (error) {
      console.error('❌ Error during quantity sync:', error.message || error);
      
      // If this is a network error, we might want to reduce sync frequency temporarily
      if (error.message && error.message.includes('Network')) {
        console.log('🌐 Network error detected, continuing with normal sync...');
      }
    }
  }

  /**
   * Check for quantity changes and update Redux store
   */
  checkForQuantityChanges(dishes) {
    let changesDetected = false;

    dishes.forEach(dish => {
      const dishId = dish.dish_id;
      const currentQuantity = dish.quantity;
      const cachedQuantity = this.dishQuantities.get(dishId);

      // Check if quantity changed
      if (cachedQuantity !== undefined && cachedQuantity !== currentQuantity) {
        console.log(`📊 Quantity updated for "${dish.name}": ${cachedQuantity} → ${currentQuantity}`);
        
        try {
          // Validate dish data before dispatching
          if (!dish.dish_id || dish.name === undefined || dish.quantity === undefined) {
            console.warn('⚠️ Invalid dish data, skipping Redux update:', dish);
            this.dishQuantities.set(dishId, currentQuantity); // Still update cache
            return;
          }
          
          // Check if dispatch function is available (preferred method)
          if (this.dispatchFunction) {
            this.dispatchFunction(updateDishRealtime(dish));
            // Also update cart items with new stock info
            this.dispatchFunction(updateCartItemStock({ dishId: dishId, newStock: currentQuantity }));
            changesDetected = true;
            console.log(`✅ Dispatched menu & cart update for "${dish.name}" via component dispatch`);
          }
          // Fallback to global store if dispatch not set
          else if (store && store.dispatch) {
            store.dispatch(updateDishRealtime(dish));
            // Also update cart items with new stock info
            store.dispatch(updateCartItemStock({ dishId: dishId, newStock: currentQuantity }));
            changesDetected = true;
            console.log(`✅ Dispatched menu & cart update for "${dish.name}" via global store`);
          } else {
            console.warn('⚠️ No dispatch method available, skipping Redux update');
          }
          
          // Show notification for significant changes
          if (Math.abs(currentQuantity - cachedQuantity) >= 1) {
            this.showQuantityChangeNotification(dish.name, cachedQuantity, currentQuantity);
          }
        } catch (error) {
          console.error('❌ Error dispatching to Redux store:', error.message || error);
          console.error('📋 Dish data that caused error:', JSON.stringify(dish, null, 2));
          
          // Continue processing other dishes even if one fails
        }
      }

      // Always update cache regardless of Redux success/failure
      this.dishQuantities.set(dishId, currentQuantity);
    });

    if (changesDetected) {
      console.log('🔄 Dish quantities updated in app');
    }
    
    // Validate entire cart against current stock periodically
    this.validateEntireCart(dishes);
  }

  /**
   * Show notification for quantity changes
   */
  showQuantityChangeNotification(dishName, oldQuantity, newQuantity) {
    const change = newQuantity - oldQuantity;
    const action = change > 0 ? 'restocked' : 'sold';
    const absChange = Math.abs(change);
    
    console.log(`📢 ${dishName} ${action}: ${absChange} units (${newQuantity} remaining)`);
    
    // You could show a toast notification here if you have a toast library
    // Example:
    // toast.info(`${dishName} ${action}: ${absChange} units (${newQuantity} remaining)`, {
    //   duration: 3000,
    //   position: 'bottom-center',
    //   style: { backgroundColor: change > 0 ? '#10B981' : '#F59E0B' }
    // });
  }

  /**
   * Validate entire cart against current stock
   */
  validateEntireCart(dishes) {
    try {
      // Only validate every 10th sync to avoid performance issues
      if (this.syncCount % 10 === 0) {
        if (this.dispatchFunction) {
          this.dispatchFunction(validateCartStock(dishes));
        } else if (store && store.dispatch) {
          store.dispatch(validateCartStock(dishes));
        }
        console.log('🛒 Cart validated against current stock');
      }
    } catch (error) {
      console.error('❌ Error validating cart:', error);
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    console.log('🔄 Force syncing quantities...');
    await this.performSync();
  }

  /**
   * Update sync frequency
   */
  setSyncFrequency(milliseconds) {
    const oldFrequency = this.syncFrequency;
    this.syncFrequency = Math.max(1000, milliseconds); // Minimum 1 second
    
    console.log(`⚙️ Sync frequency updated: ${oldFrequency/1000}s → ${this.syncFrequency/1000}s`);
    
    // Restart sync with new frequency if active
    if (this.isActive) {
      this.stopSync();
      this.startSync();
    }
  }

  /**
   * Get sync status and statistics
   */
  getStatus() {
    return {
      isActive: this.isActive,
      syncFrequency: this.syncFrequency,
      lastSync: this.lastSync,
      cachedDishes: this.dishQuantities.size,
      nextSync: this.isActive ? Date.now() + this.syncFrequency : null
    };
  }

  /**
   * Set up fast sync during active billing
   * Call this when user is on menu screen or during active ordering
   */
  activateFastSync() {
    console.log('⚡ Activating fast sync mode...');
    this.setSyncFrequency(3000); // 3 seconds for active periods (reasonable balance)
  }

  /**
   * Set up ultra-fast sync during checkout
   * Call this during payment processing to catch last-minute stock changes
   */
  activateCheckoutSync() {
    console.log('🚀 Activating checkout sync mode...');
    this.setSyncFrequency(1000); // 1 second during checkout
  }

  /**
   * Set up normal sync for background
   * Call this when app goes to background or user leaves menu
   */
  activateNormalSync() {
    console.log('🔄 Activating normal sync mode...');
    this.setSyncFrequency(10000); // 10 seconds for background
  }

  /**
   * Initialize the service
   */
  initialize() {
    try {
      console.log('🔧 Initializing quantity sync service...');
      
      // Check if we have the necessary dependencies
      if (!updateDishRealtime) {
        console.error('❌ updateDishRealtime action not imported properly');
        return;
      }
      
      this.startSync();
      
      // Set up app state listeners for adaptive sync frequency
      this.setupAdaptiveSync();
      
      console.log('✅ Quantity sync service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing quantity sync service:', error);
    }
  }

  /**
   * Setup adaptive sync based on app usage
   */
  setupAdaptiveSync() {
    // You can implement app state listeners here
    // For React Native, you'd use AppState
    console.log('📱 Adaptive sync configured');
  }

  /**
   * Cleanup when app closes
   */
  cleanup() {
    this.stopSync();
    this.dishQuantities.clear();
    console.log('🧹 Quantity sync service cleaned up');
  }
}

// Create singleton instance
const quantitySyncService = new QuantitySyncService();

export default quantitySyncService;
