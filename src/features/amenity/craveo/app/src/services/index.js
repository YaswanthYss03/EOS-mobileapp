// Service layer entry point — backed by the Express + Prisma REST backend
// (Restaurent_App/backend) over HTTP, via backendAPI.js/httpClient.js.
// Previously this re-exported the Supabase-direct implementation in
// supabaseAPI.js; that file has been removed.
import {
  authAPI as backendAuthAPI,
  menuAPI as backendMenuAPI,
  orderAPI as backendOrderAPI,
  paymentAPI as backendPaymentAPI,
  qrAPI as backendQRAPI,
  todaysSpecialAPI as backendTodaysSpecialAPI,
  staffAPI as backendStaffAPI,
} from './backendAPI';

export const authAPI = backendAuthAPI;
export const menuAPI = backendMenuAPI;
export const orderAPI = backendOrderAPI;
export const paymentAPI = backendPaymentAPI;
export const qrAPI = backendQRAPI;
export const todaysSpecialAPI = backendTodaysSpecialAPI;
export const staffAPI = backendStaffAPI;

export const API_MODE = 'rest-backend';
