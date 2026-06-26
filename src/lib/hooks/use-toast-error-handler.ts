import { useCallback } from "react";
import { toast } from "sonner";

type ToastErrorHandlerOptions = {
  fallbackMessage: string;
  mapMessage?: (error: unknown) => string | null | undefined;
};

export function useToastErrorHandler({ fallbackMessage, mapMessage }: ToastErrorHandlerOptions) {
  return useCallback((error: unknown) => {
    const mappedMessage = mapMessage?.(error);
    const errorMessage = error instanceof Error ? error.message : null;
    toast.error(mappedMessage || errorMessage || fallbackMessage);
  }, [fallbackMessage, mapMessage]);
}
