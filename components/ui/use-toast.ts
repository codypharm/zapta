"use client";

import { useState, useCallback } from "react";
import { ToastProps } from "./toast";

type ToastState = ToastProps & {
  id: string;
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const toast = useCallback((props: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: ToastState = {
      ...props,
      id,
      open: true,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
