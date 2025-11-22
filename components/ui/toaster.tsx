"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      <ToastViewport>
        {toasts.map(function ({ id, title, description, action, ...props }) {
          return (
            <Toast 
              key={id} 
              title={title}
              description={description}
              action={action}
              {...props}
            />
          );
        })}
      </ToastViewport>
    </ToastProvider>
  );
}
