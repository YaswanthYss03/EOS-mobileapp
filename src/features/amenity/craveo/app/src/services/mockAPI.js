// Mock API implementations for testing without backend
import { 
  sampleDishes, 
  sampleUser, 
  sampleOrders, 
  mockAPIResponses 
} from '../utils/sampleData';

// Simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAuthAPI = {
  signup: async ({ name, email, password }) => {
    await delay(1500);
    
    // Basic validation
    if (!name || name.length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Simulate checking if user already exists
    if (email === 'existing@sece.ac.in') {
      throw new Error('Email already exists');
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Account created successfully',
      user: newUser,
      token: `token_${Date.now()}`,
    };
  },

  login: async ({ email, password }) => {
    await delay(1000);
    
    if (!email || !password) {
      throw new Error('Please enter both email and password');
    }

    // Simulate invalid credentials
    if (email === 'invalid@example.com' || password === 'wrong') {
      throw new Error('Invalid email or password');
    }

    const user = {
      id: 123456,
      name: 'John Doe',
      email: email,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Login successful',
      user,
      token: `token_${Date.now()}`,
    };
  },

  logout: async () => {
    await delay(500);
    return { success: true, message: 'Logged out successfully' };
  },
};

export const mockMenuAPI = {
  getMenu: async () => {
    await delay(1200);
    return {
      success: true,
      dishes: sampleDishes,
      inventoryAvailable: true,
    };
  },

  getInventoryStatus: async () => {
    await delay(500);
    return {
      success: true,
      inventoryAvailable: true,
      dishes: sampleDishes,
    };
  },
};

export const mockOrderAPI = {
  createOrder: async (orderData) => {
    await delay(1500);
    const newOrder = {
      ...mockAPIResponses.createOrder.order,
      ...orderData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      order: newOrder,
    };
  },

  getOrders: async () => {
    await delay(800);
    return {
      success: true,
      orders: sampleOrders,
    };
  },

  getOrderById: async (orderId) => {
    await delay(600);
    const order = sampleOrders.find(o => o.id.toString() === orderId.toString());
    if (order) {
      return {
        success: true,
        order,
      };
    }
    throw new Error('Order not found');
  },
};

export const mockPaymentAPI = {
  initiatePayment: async (paymentData) => {
    await delay(1000);
    return {
      success: true,
      paymentId: `PAY_${Date.now()}`,
      paymentUrl: 'mock://payment/url',
    };
  },

  verifyPayment: async (paymentId) => {
    await delay(2000);
    return {
      success: true,
      status: 'success',
      transactionId: `TXN_${Date.now()}`,
    };
  },
};

export const mockQRAPI = {
  scanQR: async (qrData) => {
    await delay(800);
    // Simulate successful QR scan
    const mockOrder = {
      id: Math.floor(Math.random() * 10000),
      tokenNumber: Date.now().toString().slice(-8),
      items: [
        {
          dish: sampleDishes[0],
          quantity: 1,
          price: sampleDishes[0].price,
        },
      ],
      totalAmount: sampleDishes[0].price,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedTime: 8,
    };

    return {
      success: true,
      order: mockOrder,
    };
  },

  getTokenDetails: async (tokenNumber) => {
    await delay(500);
    return {
      success: true,
      order: sampleOrders[0],
    };
  },
};
