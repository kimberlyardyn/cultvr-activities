"use client";

/**
 * Lightweight global toast system.
 *
 * - `toast.success(msg)` / `toast.error(msg)` / `toast.info(msg)` can be called
 *   from anywhere (event handlers, server-action callbacks, plain functions) —
 *   no context provider or hook required.
 * - `<Toaster />` is mounted once in the root layout and renders the stack.
 *
 * Uses a module-level store + `useSyncExternalStore` so the API is decoupled
 * from React's tree.
 */
import { useSyncExternalStore } from "react";

type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  // New array reference so useSyncExternalStore detects the change.
  toasts = [...toasts];
  for (const l of listeners) l();
}

function remove(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  for (const l of listeners) l();
}

function push(kind: ToastKind, message: string, durationMs = 3200) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  for (const l of listeners) l();
  if (durationMs > 0) {
    setTimeout(() => remove(id), durationMs);
  }
  return id;
}

export const toast = {
  success: (message: string, durationMs?: number) => push("success", message, durationMs),
  error: (message: string, durationMs?: number) => push("error", message, durationMs ?? 5000),
  info: (message: string, durationMs?: number) => push("info", message, durationMs),
  dismiss: (id: number) => remove(id),
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return toasts;
}

const EMPTY: Toast[] = [];
function getServerSnapshot() {
  return EMPTY;
}

const KIND_STYLES: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: "#6f9e6f", icon: "✓" },
  error: { bar: "#c4697a", icon: "!" },
  info: { bar: "#5b8fa8", icon: "i" },
};

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!items.length) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {items.map((t) => {
        const style = KIND_STYLES[t.kind];
        return (
          <div
            className="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl border border-black/10 bg-white/95 px-3.5 py-3 shadow-[0_10px_30px_rgba(31,36,51,0.16)] backdrop-blur"
            key={t.id}
            role="status"
            style={{ animation: "toastIn 180ms ease-out" }}
          >
            <span
              aria-hidden
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold text-white"
              style={{ backgroundColor: style.bar }}
            >
              {style.icon}
            </span>
            <p className="min-w-0 flex-1 text-[0.82rem] leading-5 text-[#1f2433]">
              {t.message}
            </p>
            <button
              aria-label="Dismiss"
              className="-mr-1 shrink-0 rounded p-0.5 text-[#1f2433]/40 transition hover:text-[#1f2433]"
              onClick={() => toast.dismiss(t.id)}
              type="button"
            >
              <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 12 12" width="12">
                <line x1="2" x2="10" y1="2" y2="10" />
                <line x1="10" x2="2" y1="2" y2="10" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
