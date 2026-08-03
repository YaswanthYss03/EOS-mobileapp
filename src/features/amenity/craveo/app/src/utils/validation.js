// Validation utilities for mobile app
export const validateStudentData = (data) => {
  const errors = {};

  if (!data.name || data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateOrderData = (orderData) => {
  const errors = {};

  if (!orderData.items || orderData.items.length === 0) {
    errors.items = 'Order must contain at least one item';
  }

  if (!orderData.totalAmount || orderData.totalAmount <= 0) {
    errors.totalAmount = 'Total amount must be greater than 0';
  }

  // Validate each item
  orderData.items?.forEach((item, index) => {
    if (!item.dishId) {
      errors[`item_${index}_dishId`] = 'Dish ID is required';
    }
    if (!item.quantity || item.quantity <= 0) {
      errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
    }
    if (!item.price || item.price <= 0) {
      errors[`item_${index}_price`] = 'Price must be greater than 0';
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Error handling helper
export const handleAPIError = (error) => {
  console.error('API Error:', error);

  // Handle generic API error codes
  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

// Network status checker
export const checkNetworkStatus = async () => {
  try {
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      mode: 'no-cors',
      timeout: 5000,
    });
    return true;
  } catch (error) {
    return false;
  }
};

// Retry mechanism for failed requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};
