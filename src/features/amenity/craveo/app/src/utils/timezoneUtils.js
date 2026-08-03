/**
 * Timezone utilities for Indian Standard Time (IST) - Optimized for PostgreSQL timestamptz
 * Ensures all timestamps are handled correctly with timestamptz columns
 */

/**
 * Get a Date whose LOCAL calendar fields (getHours/getDate/getDay/toDateString/
 * getFullYear/etc.) are the IST wall-clock for `date` - safe to call local
 * getters on regardless of what timezone the device itself is set to.
 *
 * The rest of this file's helpers (getISTDate/convertToIST) instead do manual
 * epoch math (+5.5h) and rely on the DEVICE's own timezone to read it back via
 * local getters - that only produces the right answer when the device's
 * system timezone happens to be exactly IST. On any other device timezone
 * it's off by a device-dependent amount (this is what caused order times to
 * display on the wrong day). Use this function instead for anything that
 * calls local Date getters on the result.
 * @param {Date|string} [date] - defaults to now
 * @returns {Date}
 */
export const getISTWallClockDate = (date) => {
  const input = date === undefined ? new Date() : date instanceof Date ? date : new Date(date);
  if (isNaN(input.getTime())) return new Date(NaN);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(input)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
};

/**
 * Get current date and time in IST
 * For timestamptz columns, this provides the correct IST time
 * @returns {Date} Date object adjusted to IST
 */
export const getISTDate = () => {
  // Create a new date in IST timezone
  const now = new Date();
  
  // Get the IST offset (IST is UTC+5:30)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5; // IST is UTC+5:30
  const istTime = new Date(utcTime + (istOffset * 3600000));
  
  return istTime;
};

/**
 * Convert any date to IST
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date object in IST
 */
export const convertToIST = (date) => {
  const inputDate = new Date(date);
  
  // Get the IST offset (IST is UTC+5:30)
  const utcTime = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
  const istOffset = 5.5; // IST is UTC+5:30
  const istTime = new Date(utcTime + (istOffset * 3600000));
  
  return istTime;
};

/**
 * Get current date and time in IST as ISO string
 * @returns {string} ISO string in IST timezone
 */
export const getISTISOString = () => {
  const istDate = getISTDate();
  return istDate.toISOString();
};

/**
 * Format IST date for display
 * Works with both regular Date objects and timestamptz values from database
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatISTDate = (date) => {
  // For timestamptz values, they're already in correct timezone
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Get IST time for database operations with timestamptz columns
 * For timestamptz columns, we can send current time and PostgreSQL handles timezone conversion
 * @param {Date} [date] Optional date, defaults to current time
 * @returns {string} ISO string suitable for timestamptz database storage
 */
export const getDatabaseTimestamp = (date = null) => {
  // For timestamptz columns, we can use current time directly
  // PostgreSQL will store it with timezone info and convert as needed
  const targetDate = date || new Date();
  return targetDate.toISOString();
};

/**
 * Check if current time is after 5:30 PM IST
 * Used for COD restrictions for girls hostellers
 * @param {Date|string} date - Date to check (optional, defaults to current time)
 * @returns {boolean} True if current IST time is after 5:30 PM
 */
export const isAfter530PMIST = (date = null) => {
  let checkDate;
  
  if (date) {
    // Convert the provided date to IST
    checkDate = convertToIST(date);
  } else {
    // Use current IST time
    checkDate = getISTDate();
  }
  
  const currentHour = checkDate.getHours();
  const currentMinute = checkDate.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const cutoffTime = 17 * 60 + 30; // 5:30 PM in minutes
  
  return currentTimeInMinutes >= cutoffTime;
};

/**
 * Check if current time is after 7:00 PM IST
 * Used for ordering restrictions for girls hostellers
 * @param {Date|string} date - Date to check (optional, defaults to current time)
 * @returns {boolean} True if current IST time is after 7:00 PM
 */
export const isAfter7PMIST = (date = null) => {
  let checkDate;
  
  if (date) {
    // Convert the provided date to IST
    checkDate = convertToIST(date);
  } else {
    // Use current IST time
    checkDate = getISTDate();
  }
  
  const currentHour = checkDate.getHours();
  const currentMinute = checkDate.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const cutoffTime = 18 * 60; // 6:00 PM in minutes (18:00)
  
  return currentTimeInMinutes >= cutoffTime;
};

/**
 * Get time in IST for display purposes
 * @returns {string} Current IST time formatted for display
 */
export const getCurrentISTTime = () => {
  const istDate = getISTDate();
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get date in IST for display purposes
 * @returns {string} Current IST date formatted for display
 */
export const getCurrentISTDate = () => {
  const istDate = getISTDate();
  return istDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get today's date range for querying timestamptz columns
 * Returns start and end of day in UTC (for timestamptz queries)
 * @returns {Object} {start: Date, end: Date} UTC dates for database queries
 */
export const getTodayISTRangeForDB = () => {
  const istNow = getISTDate();
  
  // Start of today in IST (00:00:00)
  const startOfDayIST = new Date(istNow);
  startOfDayIST.setHours(0, 0, 0, 0);
  
  // End of today in IST (23:59:59.999)
  const endOfDayIST = new Date(istNow);
  endOfDayIST.setHours(23, 59, 59, 999);
  
  // Convert IST to UTC for timestamptz queries
  const startUTC = new Date(startOfDayIST.getTime() - (5.5 * 60 * 60 * 1000));
  const endUTC = new Date(endOfDayIST.getTime() - (5.5 * 60 * 60 * 1000));
  
  return {
    start: startUTC,
    end: endUTC
  };
};

/**
 * Format timestamptz value from database for display
 * @param {string|Date} timestamptz - Value from timestamptz column
 * @returns {string} Formatted IST display string
 */
export const formatTimestamptzToIST = (timestamptz) => {
  if (!timestamptz || timestamptz === null || timestamptz === undefined) {
    return '';
  }
  
  try {
    const utcDate = new Date(timestamptz);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      console.warn('⚠️ Invalid date received:', timestamptz);
      return '';
    }
    
    // Check for epoch date (1970)
    if (utcDate.getFullYear() === 1970) {
      console.warn('⚠️ Epoch date detected, likely invalid:', timestamptz);
      return '';
    }
    
    // IST wall-clock fields, correct regardless of the device's own timezone
    const istDate = getISTWallClockDate(utcDate);

    // Format in 12-hour format manually
    const day = istDate.getDate().toString().padStart(2, '0');
    const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
    const year = istDate.getFullYear();
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes().toString().padStart(2, '0');
    const seconds = istDate.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
    
    const formatted = `${day}/${month}/${year}, ${displayHours}:${minutes}:${seconds} ${ampm}`;
    
    console.log('🕐 UTC to IST conversion:', {
      input: timestamptz,
      utc: utcDate.toISOString(),
      istDate: istDate.toString(),
      formatted: formatted
    });
    
    return formatted;
  } catch (error) {
    console.error('❌ Error formatting timestamptz:', error, 'Input:', timestamptz);
    return '';
  }
};

// Debug function to test timezone conversion
export const debugTimezoneConversion = (utcString) => {
  console.log('🔍 DEBUG: Testing timezone conversion');
  console.log('📥 Input UTC string:', utcString);
  
  const utcDate = new Date(utcString);
  console.log('⏰ Parsed UTC date:', utcDate.toISOString());
  console.log('🕐 UTC time display:', utcDate.toString());
  
  const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
  console.log('🇮🇳 IST date:', istDate.toString());
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const timeFormatted = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  
  console.log('📱 Final IST display:', timeFormatted);
  
  return {
    utcInput: utcString,
    utcParsed: utcDate.toISOString(),
    istConverted: istDate.toString(),
    istFormatted: timeFormatted
  };
};

export default {
  getISTDate,
  convertToIST,
  getISTISOString,
  formatISTDate,
  getDatabaseTimestamp,
  isAfter530PMIST,
  isAfter7PMIST,
  getCurrentISTTime,
  getCurrentISTDate,
  getTodayISTRangeForDB,
  formatTimestamptzToIST,
  debugTimezoneConversion
};
