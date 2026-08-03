import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderAPI } from '../../services';
import { ERROR_MESSAGES } from '../../constants/config';

const initialState = {
  pendingOrders: [],
  completedOrders: [],
  currentOrder: null,
  loading: false,
  error: null,
  paymentStatus: null,
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    createOrderStart: (state) => {
      state.loading = true;
      state.error = null;
      state.paymentStatus = null;
    },
    createOrderSuccess: (state, action) => {
      state.loading = false;
      state.currentOrder = action.payload;
      state.pendingOrders.push(action.payload);
      state.error = null;
    },
    createOrderFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchOrdersStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchOrdersSuccess: (state, action) => {
      state.loading = false;
      state.pendingOrders = action.payload.pending;
      state.completedOrders = action.payload.completed;
      state.error = null;
    },
    fetchOrdersFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status } = action.payload;
      
      if (status === 'completed') {
        const orderIndex = state.pendingOrders.findIndex(order => order.id === orderId);
        if (orderIndex >= 0) {
          const order = state.pendingOrders[orderIndex];
          order.status = 'completed';
          order.completedAt = new Date().toISOString();
          
          state.completedOrders.push(order);
          state.pendingOrders.splice(orderIndex, 1);
        }
      }
    },
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  createOrderStart,
  createOrderSuccess,
  createOrderFailure,
  fetchOrdersStart,
  fetchOrdersSuccess,
  fetchOrdersFailure,
  updateOrderStatus,
  setCurrentOrder,
  setPaymentStatus,
  clearCurrentOrder,
  clearError,
} = orderSlice.actions;

export default orderSlice.reducer;
