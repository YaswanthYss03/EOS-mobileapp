import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  total: 0,
  itemCount: 0,
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const quantityToAdd = item.quantity || 1;
      // Get available stock from item (real-time data from sync service)
      const availableStock = item.quantity_available || item.available_quantity || item.stock || item.available || item.quantity || 0;
      
      const existingItem = state.items.find(cartItem => cartItem.id === item.id);
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      const totalRequestedQuantity = currentCartQuantity + quantityToAdd;
      
      // Validate stock availability
      if (totalRequestedQuantity > availableStock) {
        console.warn(`⚠️ Cannot add ${quantityToAdd} of "${item.name}". Available: ${availableStock}, Already in cart: ${currentCartQuantity}, Requested total: ${totalRequestedQuantity}`);
        // Don't add to cart if it exceeds available stock
        return;
      }
      
      if (existingItem) {
        existingItem.quantity += quantityToAdd;
        // Update available stock in cart item for future validations
        existingItem.availableStock = availableStock;
      } else {
        state.items.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: quantityToAdd,
          image: item.image,
          isVeg: item.isVeg,
          category: item.category,
          orderType: 'dine-in', // Default to dine-in
          availableStock: availableStock, // Store current available stock
        });
      }
      
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    removeFromCart: (state, action) => {
      const itemId = action.payload;
      const itemIndex = state.items.findIndex(item => item.id === itemId);
      
      if (itemIndex >= 0) {
        state.items.splice(itemIndex, 1);
        state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
        state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(cartItem => cartItem.id === id);
      
      if (item) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          const itemIndex = state.items.findIndex(cartItem => cartItem.id === id);
          state.items.splice(itemIndex, 1);
        } else {
          // Check if quantity exceeds available stock
          const availableStock = item.availableStock || item.stock || item.available;
          if (availableStock && quantity > availableStock) {
            console.warn(`Cannot update quantity to ${quantity}. Only ${availableStock} available for ${item.name}`);
            item.quantity = availableStock; // Set to maximum available
          } else {
            item.quantity = quantity;
          }
        }
        
        state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
        state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
    },
    updateItemOrderType: (state, action) => {
      const { itemId, orderType } = action.payload;
      const item = state.items.find(cartItem => cartItem.id === itemId);
      
      if (item) {
        item.orderType = orderType;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    incrementQuantity: (state, action) => {
      const itemId = action.payload;
      const item = state.items.find(cartItem => cartItem.id === itemId);
      
      if (item) {
        const availableStock = item.availableStock || item.stock || item.available || 0;
        
        // Check if we can increment
        if (item.quantity < availableStock) {
          item.quantity += 1;
          state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
          state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else if (availableStock === 0) {
          console.warn(`❌ Cannot increment "${item.name}" - item is out of stock`);
          state.error = `"${item.name}" is currently out of stock`;
        } else {
          console.warn(`⚠️ Cannot increment "${item.name}" - maximum stock reached (${availableStock} available)`);
          state.error = `Only ${availableStock} "${item.name}" available`;
        }
      }
    },
    decrementQuantity: (state, action) => {
      const itemId = action.payload;
      const item = state.items.find(cartItem => cartItem.id === itemId);
      
      if (item) {
        if (item.quantity > 1) {
          item.quantity -= 1;
          state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
          state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else {
          // Remove item if quantity becomes 0
          const itemIndex = state.items.findIndex(cartItem => cartItem.id === itemId);
          state.items.splice(itemIndex, 1);
          state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
          state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
      }
    },
    // Update cart items when stock changes in real-time
    updateCartItemStock: (state, action) => {
      const { dishId, newStock } = action.payload;
      const cartItem = state.items.find(item => item.id === dishId);
      
      if (cartItem) {
        cartItem.availableStock = newStock;
        
        // If cart quantity exceeds new stock, adjust it
        if (cartItem.quantity > newStock) {
          console.warn(`📦 Stock reduced for "${cartItem.name}": ${cartItem.quantity} → ${newStock} (cart adjusted)`);
          cartItem.quantity = Math.max(0, newStock);
          
          // If stock is 0, remove from cart
          if (newStock <= 0) {
            const itemIndex = state.items.findIndex(item => item.id === dishId);
            state.items.splice(itemIndex, 1);
            console.warn(`❌ "${cartItem.name}" removed from cart (out of stock)`);
          }
          
          // Recalculate totals
          state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
          state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
      }
    },
    // Validate all cart items against current stock
    validateCartStock: (state, action) => {
      const dishesWithStock = action.payload; // Array of dishes with current stock
      let adjustments = [];
      
      state.items.forEach((cartItem, index) => {
        const currentDish = dishesWithStock.find(dish => dish.dish_id === cartItem.id);
        if (currentDish) {
          const currentStock = currentDish.quantity || 0;
          cartItem.availableStock = currentStock;
          
          // Adjust quantity if it exceeds current stock
          if (cartItem.quantity > currentStock) {
            const oldQuantity = cartItem.quantity;
            cartItem.quantity = Math.max(0, currentStock);
            adjustments.push({
              name: cartItem.name,
              oldQuantity,
              newQuantity: cartItem.quantity,
              available: currentStock
            });
            
            // Remove from cart if out of stock
            if (currentStock <= 0) {
              state.items.splice(index, 1);
            }
          }
        }
      });
      
      // Recalculate totals
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Log adjustments
      if (adjustments.length > 0) {
        console.warn(`📦 Cart adjusted due to stock changes:`, adjustments);
      }
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateItemOrderType,
  clearCart,
  setLoading,
  setError,
  clearError,
  incrementQuantity,
  decrementQuantity,
  updateCartItemStock,
  validateCartStock,
} = cartSlice.actions;

export default cartSlice.reducer;
