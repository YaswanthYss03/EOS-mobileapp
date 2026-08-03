// Backward-compatible re-export — several screens import from '../services/api'
// directly instead of '../services'. Backed by the REST backend via backendAPI.js.
import { authAPI, menuAPI, orderAPI, paymentAPI, qrAPI, todaysSpecialAPI, staffAPI } from './backendAPI';

export { authAPI, menuAPI, orderAPI, paymentAPI, qrAPI, todaysSpecialAPI, staffAPI };

export default {
  authAPI,
  menuAPI,
  orderAPI,
  paymentAPI,
  qrAPI,
  todaysSpecialAPI,
  staffAPI,
};
