import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { menuAPI } from '../../services';
import { ERROR_MESSAGES } from '../../constants/config';

const initialState = {
  dishes: [],
  categories: ['Breakfast', 'Lunch', 'Snacks', 'Drinks', 'Sweets'],
  selectedCategory: 'Breakfast',
  inventoryAvailable: true,
  loading: false,
  error: null,
  lastUpdated: null,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    fetchMenuStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchMenuSuccess: (state, action) => {
      state.loading = false;
      state.dishes = action.payload.dishes;
      state.inventoryAvailable = action.payload.inventoryAvailable;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    fetchMenuFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    updateDishQuantity: (state, action) => {
      const { dishId, quantity } = action.payload;
      
      // Ensure dishes array exists
      if (!state.dishes || !Array.isArray(state.dishes)) {
        console.warn('⚠️ Dishes array not initialized, skipping quantity update');
        return;
      }
      
      const dish = state.dishes.find(d => d.id === dishId || d.dish_id === dishId);
      if (dish) {
        dish.remainingQuantity = quantity;
        dish.quantity = quantity;
        dish.quantity_available = quantity;
        dish.available_quantity = quantity;
      }
    },
    updateDishRealtime: (state, action) => {
      const updatedDish = action.payload;
      
      // Ensure dishes array exists
      if (!state.dishes || !Array.isArray(state.dishes)) {
        console.warn('⚠️ Dishes array not initialized, skipping realtime update');
        return;
      }
      
      const dishIndex = state.dishes.findIndex(d => 
        d.id === updatedDish.dish_id || 
        d.dish_id === updatedDish.dish_id
      );
      
      if (dishIndex !== -1) {
        // Update the dish with new data
        state.dishes[dishIndex] = {
          ...state.dishes[dishIndex],
          ...updatedDish,
          quantity: updatedDish.quantity,
          quantity_available: updatedDish.quantity,
          available_quantity: updatedDish.quantity,
          remainingQuantity: updatedDish.quantity
        };
        
        console.log(`✅ Updated ${updatedDish.name} quantity to ${updatedDish.quantity} in Redux store`);
      } else {
        console.log(`⚠️ Dish with ID ${updatedDish.dish_id} not found in store for realtime update`);
      }
    },
    setInventoryStatus: (state, action) => {
      state.inventoryAvailable = action.payload;
    },
  },
});

export const {
  fetchMenuStart,
  fetchMenuSuccess,
  fetchMenuFailure,
  setSelectedCategory,
  updateDishQuantity,
  updateDishRealtime,
  setInventoryStatus,
} = menuSlice.actions;

export default menuSlice.reducer;
