/**
 * Modern Design System
 * 
 * Enhanced design tokens for a sophisticated, modern UI with
 * gradients, glassmorphism, animations, and real-time visual feedback
 */

// Modern Color System with Gradients
export const modernColors = {
  // Sleek black gradients for professional look
  gradients: {
    primary: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
    secondary: 'linear-gradient(135deg, #2a2a2a 0%, #0a0a0a 100%)',
    success: 'linear-gradient(135deg, #0d1117 0%, #0a3d2e 100%)',
    warning: 'linear-gradient(135deg, #1a1a1a 0%, #3d2e0a 100%)',
    danger: 'linear-gradient(135deg, #1a1a1a 0%, #3d0a0a 100%)',
    info: 'linear-gradient(135deg, #0d1117 0%, #0a2d3d 100%)',
    dark: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
    mesh: 'radial-gradient(at 40% 20%, hsla(0,0%,15%,0.8) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(0,0%,20%,0.8) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(0,0%,10%,0.8) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(0,0%,25%,0.8) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(0,0%,15%,0.8) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(0,0%,20%,0.8) 0px, transparent 50%), radial-gradient(at 0% 0%, hsla(0,0%,10%,0.8) 0px, transparent 50%)',
  },
  
  // Glassmorphism effects with darker tones
  glass: {
    background: 'rgba(20, 20, 20, 0.6)',
    backgroundDark: 'rgba(0, 0, 0, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderDark: 'rgba(255, 255, 255, 0.05)',
    blur: 'blur(10px)',
    heavyBlur: 'blur(20px)',
  },
  
  // Subtle accents for real-time indicators
  neon: {
    green: '#00ff88',
    blue: '#00d4ff',
    silver: '#c0c0c0',
    pink: '#ff0080',
    yellow: '#ffea00',
    orange: '#ff6600',
  },
  
  // Soft pastels for backgrounds
  pastel: {
    lavender: '#e3d5ff',
    mint: '#c3f9e3',
    peach: '#ffd5cc',
    sky: '#c3e7ff',
    lemon: '#fff5c3',
    rose: '#ffc3d5',
  },
  
  // Dark mode enhancements
  dark: {
    background: '#0a0a0a',
    surface: '#141414',
    elevated: '#1a1a1a',
    border: 'rgba(255, 255, 255, 0.1)',
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)',
    }
  }
};

// Animation configurations
export const animations = {
  // Spring animations for natural motion
  spring: {
    gentle: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
    bouncy: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
    smooth: {
      type: "spring",
      stiffness: 50,
      damping: 20,
    },
  },
  
  // Easing functions
  easing: {
    easeOutExpo: [0.16, 1, 0.3, 1],
    easeInOutCubic: [0.645, 0.045, 0.355, 1],
    easeOutBack: [0.175, 0.885, 0.32, 1.275],
  },
  
  // Common transitions
  transitions: {
    fast: { duration: 0.2 },
    normal: { duration: 0.3 },
    slow: { duration: 0.5 },
    verySlow: { duration: 0.8 },
  },
};

// Shadows with glow effects
export const modernShadows = {
  sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
  glow: {
    primary: '0 0 20px rgba(102, 126, 234, 0.4)',
    success: '0 0 20px rgba(67, 233, 123, 0.4)',
    danger: '0 0 20px rgba(248, 87, 166, 0.4)',
    neon: '0 0 30px rgba(0, 212, 255, 0.5)',
  },
  glass: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(31, 38, 135, 0.37)',
};

// Modern spacing system
export const modernSpacing = {
  micro: '0.125rem',  // 2px
  tiny: '0.25rem',    // 4px
  small: '0.5rem',    // 8px
  medium: '1rem',     // 16px
  large: '1.5rem',    // 24px
  xl: '2rem',         // 32px
  '2xl': '3rem',      // 48px
  '3xl': '4rem',      // 64px
  '4xl': '6rem',      // 96px
  '5xl': '8rem',      // 128px
};

// Enhanced border radius
export const modernRadius = {
  none: '0',
  sm: '0.375rem',     // 6px
  md: '0.5rem',       // 8px
  lg: '0.75rem',      // 12px
  xl: '1rem',         // 16px
  '2xl': '1.5rem',    // 24px
  '3xl': '2rem',      // 32px
  full: '9999px',
  card: '1.25rem',    // 20px - modern card radius
};

// Z-index layers
export const layers = {
  base: 0,
  elevated: 10,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  commandPalette: 90,
  max: 100,
};

// Glassmorphism styles
export const glassStyles = {
  light: {
    background: modernColors.glass.background,
    backdropFilter: modernColors.glass.blur,
    WebkitBackdropFilter: modernColors.glass.blur,
    border: `1px solid ${modernColors.glass.border}`,
    boxShadow: modernShadows.glass,
  },
  dark: {
    background: modernColors.glass.backgroundDark,
    backdropFilter: modernColors.glass.blur,
    WebkitBackdropFilter: modernColors.glass.blur,
    border: `1px solid ${modernColors.glass.borderDark}`,
    boxShadow: modernShadows.glass,
  },
  heavy: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: modernColors.glass.heavyBlur,
    WebkitBackdropFilter: modernColors.glass.heavyBlur,
    border: `1px solid ${modernColors.glass.borderDark}`,
    boxShadow: modernShadows.glass,
  },
};

// Modern card styles with hover effects
export const cardStyles = {
  base: {
    borderRadius: modernRadius.card,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  elevated: {
    ...glassStyles.light,
    boxShadow: modernShadows.lg,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: modernShadows.xl,
    },
  },
  interactive: {
    cursor: 'pointer',
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: modernShadows['2xl'],
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  },
  gradient: {
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: modernRadius.card,
      padding: '2px',
      background: modernColors.gradients.primary,
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
    },
  },
};

// Animation variants for Framer Motion
export const motionVariants = {
  // Page transitions
  pageInitial: { opacity: 0, y: 20 },
  pageAnimate: { opacity: 1, y: 0 },
  pageExit: { opacity: 0, y: -20 },
  
  // Card animations
  cardHover: { scale: 1.02, transition: { duration: 0.2 } },
  cardTap: { scale: 0.98 },
  
  // List animations
  listContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  listItem: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  
  // Fade variants
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  // Scale variants
  scaleIn: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },
  
  // Slide variants
  slideInRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
  },
};

// Real-time indicator styles
export const realtimeStyles = {
  pulse: {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  glow: {
    animation: 'glow 2s ease-in-out infinite alternate',
  },
  blink: {
    animation: 'blink 1s step-end infinite',
  },
  connectedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: modernColors.neon.green,
    boxShadow: `0 0 10px ${modernColors.neon.green}`,
    animation: 'pulse 2s infinite',
  },
  disconnectedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ef4444',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
  },
};

// Utility functions
export const getGradientByStatus = (status: 'success' | 'warning' | 'danger' | 'info' | 'primary') => {
  return modernColors.gradients[status] || modernColors.gradients.primary;
};

export const getNeonByStatus = (status: 'success' | 'warning' | 'danger' | 'info') => {
  const neonMap = {
    success: modernColors.neon.green,
    warning: modernColors.neon.yellow,
    danger: modernColors.neon.pink,
    info: modernColors.neon.blue,
  };
  return neonMap[status] || modernColors.neon.blue;
};

// Modern loading animation keyframes
export const keyframes = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  @keyframes glow {
    from {
      box-shadow: 0 0 10px -10px currentColor;
    }
    to {
      box-shadow: 0 0 20px 10px currentColor;
    }
  }
  
  @keyframes blink {
    0%, 50%, 100% {
      opacity: 1;
    }
    25%, 75% {
      opacity: 0;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes slideInUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;