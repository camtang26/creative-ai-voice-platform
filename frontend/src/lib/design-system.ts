/**
 * Design System
 * 
 * This file defines the core design tokens and utilities for maintaining
 * a consistent visual language across the application.
 */

// Color System
export const colors = {
  // Primary palette
  primary: {
    50: 'hsl(215, 100%, 97%)',
    100: 'hsl(215, 100%, 92%)',
    200: 'hsl(215, 95%, 85%)',
    300: 'hsl(215, 90%, 70%)',
    400: 'hsl(215, 85%, 60%)',
    500: 'hsl(215, 80%, 50%)', // Primary brand color
    600: 'hsl(215, 85%, 40%)',
    700: 'hsl(215, 90%, 30%)',
    800: 'hsl(215, 95%, 20%)',
    900: 'hsl(215, 100%, 10%)',
  },
  
  // Semantic colors
  success: {
    50: 'hsl(145, 100%, 97%)',
    100: 'hsl(145, 90%, 92%)',
    200: 'hsl(145, 85%, 85%)',
    300: 'hsl(145, 80%, 70%)',
    400: 'hsl(145, 70%, 60%)',
    500: 'hsl(145, 65%, 50%)',
    600: 'hsl(145, 70%, 40%)',
    700: 'hsl(145, 75%, 30%)',
    800: 'hsl(145, 80%, 20%)',
    900: 'hsl(145, 85%, 10%)',
  },
  
  warning: {
    50: 'hsl(45, 100%, 97%)',
    100: 'hsl(45, 100%, 92%)',
    200: 'hsl(45, 95%, 85%)',
    300: 'hsl(45, 90%, 70%)',
    400: 'hsl(45, 85%, 60%)',
    500: 'hsl(45, 80%, 50%)',
    600: 'hsl(45, 85%, 40%)',
    700: 'hsl(45, 90%, 30%)',
    800: 'hsl(45, 95%, 20%)',
    900: 'hsl(45, 100%, 10%)',
  },
  
  error: {
    50: 'hsl(0, 100%, 97%)',
    100: 'hsl(0, 100%, 92%)',
    200: 'hsl(0, 95%, 85%)',
    300: 'hsl(0, 90%, 70%)',
    400: 'hsl(0, 85%, 60%)',
    500: 'hsl(0, 80%, 50%)',
    600: 'hsl(0, 85%, 40%)',
    700: 'hsl(0, 90%, 30%)',
    800: 'hsl(0, 95%, 20%)',
    900: 'hsl(0, 100%, 10%)',
  },
  
  // Neutral colors
  neutral: {
    50: 'hsl(210, 20%, 98%)',
    100: 'hsl(210, 15%, 95%)',
    200: 'hsl(210, 10%, 90%)',
    300: 'hsl(210, 5%, 80%)',
    400: 'hsl(210, 5%, 65%)',
    500: 'hsl(210, 5%, 55%)',
    600: 'hsl(210, 5%, 45%)',
    700: 'hsl(210, 5%, 35%)',
    800: 'hsl(210, 5%, 25%)',
    900: 'hsl(210, 5%, 15%)',
  },
};

// Status colors for call states
export const statusColors = {
  initiated: {
    bg: colors.primary[100],
    text: colors.primary[700],
    border: colors.primary[300],
  },
  ringing: {
    bg: colors.warning[100],
    text: colors.warning[700],
    border: colors.warning[300],
  },
  'in-progress': {
    bg: colors.success[100],
    text: colors.success[700],
    border: colors.success[300],
  },
  completed: {
    bg: colors.neutral[100],
    text: colors.neutral[700],
    border: colors.neutral[300],
  },
  failed: {
    bg: colors.error[100],
    text: colors.error[700],
    border: colors.error[300],
  },
  busy: {
    bg: colors.error[100],
    text: colors.error[700],
    border: colors.error[300],
  },
  'no-answer': {
    bg: colors.warning[100],
    text: colors.warning[700],
    border: colors.warning[300],
  },
  canceled: {
    bg: colors.neutral[100],
    text: colors.neutral[700],
    border: colors.neutral[300],
  },
};

// Spacing system
export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
};

// Typography
export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
};

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
};

// Transitions
export const transitions = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  timing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Z-index
export const zIndex = {
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  auto: 'auto',
};

// Animation
export const animation = {
  none: 'none',
  spin: 'spin 1s linear infinite',
  ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  bounce: 'bounce 1s infinite',
};

// Breakpoints
export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Helper functions
export const getStatusColor = (status: string) => {
  return statusColors[status as keyof typeof statusColors] || statusColors.initiated;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m 0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

export const formatPhoneNumber = (phoneNumber: string): string => {
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
};