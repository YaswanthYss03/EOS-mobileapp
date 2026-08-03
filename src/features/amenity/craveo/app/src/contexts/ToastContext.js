import React, { createContext, useContext } from 'react';
import { toast } from '../../../../../../utils/toast';

// This is now just a thin compatibility shim over the shared global toast
// (src/utils/toast.ts, rendered once by src/components/ui/ToastHost.tsx at the
// app root) so existing screens calling useToast()/showSuccess()/etc. keep
// working unchanged. New Craveo code should import { toast } from the shared
// module directly instead of going through this context.
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const value = {
    showToast: (message, type = 'success', duration) => {
      const fn = toast[type] || toast.success;
      fn(message, duration);
    },
    showSuccess: (message, duration) => toast.success(message, duration),
    showError: (message, duration) => toast.error(message, duration),
    showWarning: (message, duration) => toast.warning(message, duration),
    showInfo: (message, duration) => toast.info(message, duration),
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
