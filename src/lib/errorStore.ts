"use client";

import { AppError } from "./errors";
import { isIgnorableError } from "./errorIgnore";

export interface DisplayToast extends AppError {
  count: number;
  toastId: string;
  onRetry?: () => void | Promise<void>;
}

export interface ErrorStoreState {
  toasts: DisplayToast[];
  history: AppError[];
  unreadCount: number;
  isDrawerOpen: boolean;
}

const MAX_HISTORY = 100;
const DEDUPE_WINDOW_MS = 8000;

let state: ErrorStoreState = {
  toasts: [],
  history: [],
  unreadCount: 0,
  isDrawerOpen: false,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Dispatches a new error into the store
 */
export function dispatchError(
  err: AppError,
  retryAction?: () => void | Promise<void>
): void {
  if (isIgnorableError(err.messageTh) || isIgnorableError(err.details)) {
    console.debug("[Ignored Error]", err.code, err.messageTh);
    return;
  }

  // Add to history
  state.history = [err, ...state.history].slice(0, MAX_HISTORY);
  state.unreadCount += 1;

  // Deduplication for active toasts
  const existingToastIndex = state.toasts.findIndex(
    (t) => t.code === err.code && t.messageTh === err.messageTh
  );

  if (existingToastIndex !== -1) {
    // Increment existing toast counter
    const updated = [...state.toasts];
    updated[existingToastIndex] = {
      ...updated[existingToastIndex],
      count: updated[existingToastIndex].count + 1,
      timestamp: err.timestamp,
      onRetry: retryAction || updated[existingToastIndex].onRetry,
    };
    state.toasts = updated;
  } else {
    // New toast
    const newToast: DisplayToast = {
      ...err,
      count: 1,
      toastId: "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      onRetry: retryAction,
    };
    state.toasts = [...state.toasts, newToast];

    // Auto-dismiss info and warning toasts after 6 seconds
    if (err.severity === "info" || err.severity === "warning") {
      setTimeout(() => {
        dismissToast(newToast.toastId);
      }, 6000);
    }
  }

  notify();
}

/**
 * Removes a toast by toastId
 */
export function dismissToast(toastId: string): void {
  state.toasts = state.toasts.filter((t) => t.toastId !== toastId);
  notify();
}

/**
 * Clears all active toasts
 */
export function clearAllToasts(): void {
  state.toasts = [];
  notify();
}

/**
 * Toggles or sets Error Center drawer open status
 */
export function setDrawerOpen(isOpen: boolean): void {
  state.isDrawerOpen = isOpen;
  if (isOpen) {
    state.unreadCount = 0;
  }
  notify();
}

/**
 * Clears history
 */
export function clearHistory(): void {
  state.history = [];
  state.unreadCount = 0;
  notify();
}

export function getErrorState(): ErrorStoreState {
  return state;
}

export function subscribeErrorStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
