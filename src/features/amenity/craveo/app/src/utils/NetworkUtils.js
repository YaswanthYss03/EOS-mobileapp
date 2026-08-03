import { API_BASE_URL, API_ENDPOINTS_FALLBACK } from '../constants/config';

/**
 * Network utility to handle API connectivity issues
 * Tests multiple endpoints and provides fallback mechanisms
 */
export class NetworkUtils {
  
  /**
   * Test if a specific API endpoint is reachable
   */
  static async testEndpoint(baseUrl, timeout = 5000) {
    try {
      console.log(`🌐 Testing endpoint: ${baseUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${baseUrl}/payments/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Endpoint ${baseUrl} is reachable:`, data);
        return { success: true, url: baseUrl, data };
      } else {
        console.log(`❌ Endpoint ${baseUrl} returned status:`, response.status);
        return { success: false, url: baseUrl, status: response.status };
      }
    } catch (error) {
      console.log(`❌ Endpoint ${baseUrl} failed:`, error.message);
      return { success: false, url: baseUrl, error: error.message };
    }
  }
  
  /**
   * Find the best working API endpoint
   */
  static async findWorkingEndpoint() {
    console.log('🔍 Finding best API endpoint...');
    
    // Test primary endpoint first
    const primaryTest = await this.testEndpoint(API_BASE_URL.replace('/api', ''));
    if (primaryTest.success) {
      return primaryTest.url + '/api';
    }
    
    // Test fallback endpoints
    for (const fallbackUrl of API_ENDPOINTS_FALLBACK) {
      const baseUrl = fallbackUrl.replace('/api', '');
      const test = await this.testEndpoint(baseUrl);
      if (test.success) {
        console.log(`✅ Found working endpoint: ${baseUrl}`);
        return baseUrl + '/api';
      }
    }
    
    console.error('❌ No working API endpoints found');
    return null;
  }
  
  /**
   * Make API request with automatic endpoint discovery
   */
  static async makeRequest(endpoint, options = {}) {
    let workingBaseUrl = API_BASE_URL;
    
    // First try with default base URL
    try {
      console.log(`🎯 Making request to: ${workingBaseUrl}${endpoint}`);
      
      const response = await fetch(`${workingBaseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`❌ Primary endpoint failed: ${error.message}`);
      
      // Try to find a working endpoint
      const workingUrl = await this.findWorkingEndpoint();
      if (!workingUrl) {
        throw new Error('No API endpoints are reachable. Please check your network connection and ensure the backend server is running.');
      }
      
      // Retry with working endpoint
      console.log(`🔄 Retrying with working endpoint: ${workingUrl}${endpoint}`);
      const response = await fetch(`${workingUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  }
  
  /**
   * Create Razorpay order with automatic endpoint discovery
   */
  static async createRazorpayOrder(amount, receipt, notes = {}) {
    return await this.makeRequest('/payments/create-razorpay-order', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        receipt,
        notes
      }),
    });
  }
  
  /**
   * Get network diagnostic information
   */
  static async getDiagnostics() {
    console.log('🔧 Running network diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      primaryUrl: API_BASE_URL,
      fallbackUrls: API_ENDPOINTS_FALLBACK,
      tests: []
    };
    
    // Test all endpoints
    for (const url of [API_BASE_URL, ...API_ENDPOINTS_FALLBACK]) {
      const baseUrl = url.replace('/api', '');
      const test = await this.testEndpoint(baseUrl, 3000); // 3 second timeout
      diagnostics.tests.push(test);
    }
    
    console.log('📊 Network Diagnostics:', diagnostics);
    return diagnostics;
  }
}

export default NetworkUtils;