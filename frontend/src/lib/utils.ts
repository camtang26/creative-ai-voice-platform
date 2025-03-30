import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names into a single string, merging Tailwind classes properly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the API URL based on environment
 */
export function getApiUrl(): string {
  // In a production environment, this would be configured differently
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date | string | number): string {
  if (!date) return 'Invalid Date'

  const d = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date

  if (isNaN(d.getTime())) return 'Invalid Date'

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  })
}

/**
 * Formats a phone number to a readable string
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Format based on length and country code
  if (cleaned.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US with country code: +1 (XXX) XXX-XXXX
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 10) {
    // International format: +X XXX XXX XXXX
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
  }

  // Default: just return with + prefix if it doesn't match known formats
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}

/**
 * Truncates a string to a specified length
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Formats a duration in seconds to a readable string (e.g., 1h 5m or 5m 10s)
 */
export function formatDuration(seconds: number): string {
  if (seconds === undefined || seconds === null || seconds < 0) return '0s';
  if (seconds === 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60); // Use floor for whole seconds

  let result = '';
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0 || hours > 0) { // Show minutes if hours are shown or if minutes > 0
    result += `${minutes}m `;
  }
   // Always show seconds unless only hours/minutes are present and seconds are 0
  if (remainingSeconds > 0 || result === '') {
     result += `${remainingSeconds}s`;
  }

  return result.trim(); // Trim trailing space if only hours/minutes are shown
}

/**
 * Formats time in seconds into MM:SS or HH:MM:SS format
 */
export function formatTimeInSeconds(totalSeconds: number): string {
  if (totalSeconds === undefined || totalSeconds === null || totalSeconds < 0) {
    return '00:00';
  }

  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);

  const paddedSeconds = String(seconds).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');

  if (hours > 0) {
    const paddedHours = String(hours).padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  } else {
    return `${paddedMinutes}:${paddedSeconds}`;
  }
}


/**
 * Formats a number to a readable string with commas
 */
export function formatNumber(num: number): string {
  if (num === undefined || num === null) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats a percentage to a readable string
 */
export function formatPercentage(value: number, decimalPlaces: number = 1): string {
  if (value === undefined || value === null) return '0%';
  return `${value.toFixed(decimalPlaces)}%`;
}

/**
 * Generates a random ID
 */
export function generateId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Debounces a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
