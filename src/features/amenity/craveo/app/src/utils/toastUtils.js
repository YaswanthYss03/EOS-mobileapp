import NetInfo from '@react-native-community/netinfo';
import { toast } from '../../../../../../utils/toast';

// Toast utility functions - all Craveo screens already call these, so routing
// them through the shared global toast (see src/utils/toast.ts, src/components/ui/ToastHost.tsx)
// upgrades every existing call site without needing to touch each screen.
// `title` is accepted for backward compatibility with existing calls but no
// longer shown - one simple message per toast, no title/message pair.
export const showToast = {
  success: (message) => {
    toast.success(message, 3000);
  },

  error: (message) => {
    toast.error(message, 4000);
  },

  info: (message) => {
    toast.info(message, 3000);
  },

  warning: (message) => {
    toast.warning(message, 3500);
  },
};

// Network utility functions
export const checkNetworkAndShowError = async (customMessage = null) => {
  try {
    const netInfo = await NetInfo.fetch();
    const isConnected = netInfo.isConnected && netInfo.isInternetReachable;

    if (!isConnected) {
      const message = customMessage || 'No internet connection. Please check your connection and try again.';
      showToast.error(message);
      return false;
    }
    return true;
  } catch (error) {
    console.log('Network check error:', error);
    return true; // Assume connected if check fails
  }
};

// Function to determine if an error is network-related
export const isNetworkError = (error) => {
  if (typeof error === 'string') {
    return error.toLowerCase().includes('network') ||
           error.toLowerCase().includes('internet') ||
           error.toLowerCase().includes('connection') ||
           error.toLowerCase().includes('timeout') ||
           error.toLowerCase().includes('fetch');
  }

  if (error && error.message) {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('internet') ||
           message.includes('connection') ||
           message.includes('timeout') ||
           message.includes('fetch') ||
           message.includes('cors') ||
           error.code === 'ERR_NETWORK' ||
           error.code === 'NETWORK_ERROR';
  }

  return false;
};

// Enhanced error handler - always shows a plain, friendly message rather than
// forwarding the raw error/exception text to the user (that's still logged to
// the console below for debugging).
export const handleError = async (error, fallbackMessage = 'Something went wrong. Please try again.') => {
  console.log('Handling error:', error);

  // Check if it's a network error first, since that has a more specific message
  if (isNetworkError(error)) {
    const isConnected = await checkNetworkAndShowError();
    if (!isConnected) {
      return; // Network error toast already shown
    }
  }

  showToast.error(fallbackMessage);
};
