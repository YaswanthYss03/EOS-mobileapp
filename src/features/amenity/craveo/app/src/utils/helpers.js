import { formatTimestamptzToIST, convertToIST, getISTWallClockDate } from './timezoneUtils';

// Format currency to Indian Rupees
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date and time with proper timezone handling for timestamptz
export const formatDate = (dateString, options = {}) => {
  if (!dateString || dateString === null || dateString === undefined) return '--';
  
  try {
    // Use timezone-aware formatting for timestamptz values
    const result = formatTimestamptzToIST(dateString);
    return result || '--';
  } catch (error) {
    console.warn('⚠️ Date formatting error:', error, 'for dateString:', dateString);
    return '--';
  }
};

// Format time only in IST 12-hour format (Manual UTC to IST conversion)
export const formatTime = (dateString) => {
  if (!dateString || dateString === null || dateString === undefined) return '--';
  
  try {
    // Parse UTC date and convert to IST using proper timezone utilities
    const utcDate = new Date(dateString);
    if (isNaN(utcDate.getTime())) return '--';
    
    // Convert to IST using proper timezone utilities
    const istDate = convertToIST(utcDate);
    
    // Format in 12-hour format
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    // Debug logging
    console.log('🕐 Time conversion:', {
      input: dateString,
      utc: utcDate.toISOString(),
      ist: istDate.toString(),
      formatted: formattedTime
    });
    
    return formattedTime;
  } catch (error) {
    console.warn('⚠️ Time formatting error:', error, 'for dateString:', dateString);
    return '--';
  }
};

// Format order date and time for display in orders (using same method as formatDate)
export const formatOrderDateTime = (dateString) => {
  if (!dateString || dateString === null || dateString === undefined) return '--';
  
  try {
    const utcDate = new Date(dateString);
    if (isNaN(utcDate.getTime())) return '--';

    // IST wall-clock fields, correct regardless of the device's own timezone
    // (see getISTWallClockDate's doc comment - the old manual +5.5h shift here
    // only worked when the device's system timezone happened to be IST)
    const istDate = getISTWallClockDate(utcDate);
    const nowIST = getISTWallClockDate();
    const yesterdayIST = new Date(nowIST.getTime() - (24 * 60 * 60 * 1000));

    // Compare dates using date strings (simple and reliable)
    const orderDateStr = istDate.toDateString();
    const todayDateStr = nowIST.toDateString();
    const yesterdayDateStr = yesterdayIST.toDateString();

    // Format time in 12-hour format
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const timeFormat = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    // Format date based on comparison
    let dateFormat;
    if (orderDateStr === todayDateStr) {
      dateFormat = 'Today';
    } else if (orderDateStr === yesterdayDateStr) {
      dateFormat = 'Yesterday';
    } else {
      // Calculate days difference for other dates
      const diffTime = nowIST.getTime() - istDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) {
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dateFormat = weekdays[istDate.getDay()];
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = istDate.getDate();
        const month = months[istDate.getMonth()];
        const year = istDate.getFullYear();
        dateFormat = diffDays > 365 ? `${day} ${month} ${year}` : `${day} ${month}`;
      }
    }
    
    const result = `${dateFormat} at ${timeFormat}`;
    console.log('🕐 Final formatted result (FIXED):', result);
    return result;
  } catch (error) {
    console.warn('⚠️ Order date-time formatting error:', error, 'for dateString:', dateString);
    return '--';
  }
};

// Format date only with timezone handling
export const formatDateOnly = (dateString) => {
  if (!dateString || dateString === null || dateString === undefined) return '--';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--';
    
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.warn('⚠️ Date only formatting error:', error, 'for dateString:', dateString);
    return '--';
  }
};

// Generate random transaction ID
export const generateTransactionId = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9);
  return `TXN_${timestamp}_${random}`.toUpperCase();
};

// Generate order token number
export const generateTokenNumber = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${day}${month}${hours}${minutes}${seconds}${random}`;
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate SECE college email (for customer role)
export const isValidCollegeEmail = (email) => {
  const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@sece\.ac\.in$/;
  return collegeEmailRegex.test(email);
};

// Extract name from college email
// Example: yaswanthsaran.sundarp2022ai-ds@sece.ac.in -> Yaswanthsaran Sundarp
export const extractNameFromCollegeEmail = (email) => {
  if (!isValidCollegeEmail(email)) {
    return null;
  }
  
  try {
    // Extract part before @sece.ac.in
    const localPart = email.split('@')[0];
    
    // Remove year and department info (e.g., 2022ai-ds)
    // Pattern: remove 4-digit year followed by department code
    const namePart = localPart.replace(/[0-9]{4}[a-z-]*$/g, '');
    
    // Replace dots with spaces and capitalize first letters
    const cleanedName = namePart
      .replace(/\./g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // If name is empty after processing, return a default
    return cleanedName || 'Student User';
  } catch (error) {
    console.warn('Error extracting name from email:', error);
    return 'Student User';
  }
};

// Validate username based on role
export const validateUsernameByRole = (username, role) => {
  switch (role) {
    case 'admin':
      return username === 'admin';
    case 'cashier':
      return ['cashier1', 'cashier2'].includes(username);
    case 'customer':
      // For customers, accept college email format or legacy usernames
      return isValidCollegeEmail(username) || /^[a-zA-Z0-9_]+$/.test(username);
    case 'staff':
      // For staff, allow existing format
      return /^[a-zA-Z0-9_]+$/.test(username);
    default:
      return true; // Allow other roles for backward compatibility
  }
};

// Validate student ID
export const isValidStudentId = (studentId) => {
  // Assuming student ID is alphanumeric and 6-12 characters
  const studentIdRegex = /^[A-Za-z0-9]{6,12}$/;
  return studentIdRegex.test(studentId);
};

// Validate phone number
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Validate OTP
export const isValidOTP = (otp) => {
  const otpRegex = /^\d{4,6}$/;
  return otpRegex.test(otp);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Get greeting based on time
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Check if current time is within business hours
export const isWithinBusinessHours = (startHour = 8, endHour = 20) => {
  const currentHour = new Date().getHours();
  return currentHour >= startHour && currentHour < endHour;
};

// Calculate estimated preparation time based on order items
export const calculateEstimatedTime = (orderItems) => {
  if (!orderItems || orderItems.length === 0) {
    return 5; // Base time if no items
  }
  
  // Base time in minutes
  let totalTime = 5;
  
  orderItems.forEach(item => {
    if (!item || !item.quantity) return;
    
    const { quantity, category, name } = item;
    
    // Get category name with fallback
    let categoryName = 'Other';
    if (category) {
      if (typeof category === 'object' && category.dish_category_name) {
        categoryName = category.dish_category_name;
      } else if (typeof category === 'string') {
        categoryName = category;
      }
    }
    
    // Add time based on dish category
    switch (categoryName) {
      case 'Breakfast':
        totalTime += quantity * 2;
        break;
      case 'Lunch':
        totalTime += quantity * 4;
        break;
      case 'Snacks':
        totalTime += quantity * 1;
        break;
      case 'Drinks':
        totalTime += quantity * 0.5;
        break;
      default:
        totalTime += quantity * 2;
    }
  });
  
  return Math.ceil(totalTime);
};

// Capitalize first letter
export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Truncate text
export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};
