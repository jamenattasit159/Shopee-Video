"use client";

import { useEffect } from "react";
import { dispatchError } from "@/lib/errorStore";
import { toAppError } from "@/lib/errors";
import { isIgnorableError } from "@/lib/errorIgnore";

export const GlobalErrorTrap: React.FC = () => {
  useEffect(() => {
    // 1. window.onerror
    const handleGlobalError = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      if (isIgnorableError(message) || isIgnorableError(source)) {
        return;
      }
      const appErr = toAppError(error || message, undefined, {
        source,
        lineno,
        colno,
      });
      dispatchError(appErr);
    };

    // 2. unhandledrejection
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (isIgnorableError(reason)) {
        return;
      }
      const appErr = toAppError(reason);
      dispatchError(appErr);
    };

    // 3. Network offline / online events
    const handleOffline = () => {
      dispatchError(
        toAppError({
          code: "NETWORK_OFFLINE",
          severity: "warning",
          source: "ui",
          messageTh: "การเชื่อมต่ออินเทอร์เน็ตขาดหาย",
          hintTh: "กรุณาตรวจสอบการเชื่อมต่อ Wi-Fi หรืออินเทอร์เน็ตของคุณ",
        })
      );
    };

    window.addEventListener("error", handleGlobalError as any);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("error", handleGlobalError as any);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
};
