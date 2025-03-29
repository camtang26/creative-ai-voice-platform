// Adapted from shadcn-ui toast component
import { useState, useEffect, useCallback } from "react";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

const DEFAULT_TOAST_DURATION = 5000;

export function toast(props: ToastProps) {
  // In a real implementation, this would use a context
  // For this demo, we'll use a simple alert
  const message = `${props.title ? props.title + ': ' : ''}${props.description || ''}`;
  alert(message);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

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
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
      }, newToast.duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  return {
    toast: addToast,
    dismiss: removeToast,
    toasts,
  };
}
