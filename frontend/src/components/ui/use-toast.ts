// Adapted from shadcn-ui toast component
import * as React from "react"; // Ensure React is imported
import { useState, useEffect, useCallback } from "react";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: React.ReactElement; // Add optional action property
}

const DEFAULT_TOAST_DURATION = 5000;

// Internal type for toast state including the ID
interface ToastWithId extends ToastProps {
  id: number;
}

export function toast(props: ToastProps) {
  // In a real implementation, this would use a context
  // For this demo, we'll use a simple alert
  const message = `${props.title ? props.title + ': ' : ''}${props.description || ''}`;
  alert(message);
}

export function useToast() {
  // Use the internal type for the state array
  const [toasts, setToasts] = useState<ToastWithId[]>([]);

  const addToast = useCallback((props: ToastProps) => {
    const id = Date.now();
    const newToast = {
      ...props,
      id,
      duration: props.duration || DEFAULT_TOAST_DURATION,
    };
    
    setToasts((prevToasts) => [...prevToasts, newToast]);
    
    if (newToast.duration > 0) {
      setTimeout(() => {
        // prevToasts is now correctly typed as ToastWithId[]
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
      }, newToast.duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    // prevToasts is now correctly typed as ToastWithId[]
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  return {
    toast: addToast,
    dismiss: removeToast,
    toasts,
  };
}
