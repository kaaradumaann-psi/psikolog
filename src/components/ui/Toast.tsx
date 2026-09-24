import { useEffect, useState } from 'react';

export type ToastItem = {
  id: string;
  message: string;
  tone?: 'default' | 'success' | 'error' | 'warning';
};

let listeners = new Set<(toasts: ToastItem[]) => void>();
let toasts: ToastItem[] = [];

function notify() {
  for (const fn of listeners) fn([...toasts]);
}

export function showToast(message: string, tone: ToastItem['tone'] = 'default') {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, tone }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 3200);
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>(() => [...toasts]);
  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);
  return items;
}

export function ToastStack() {
  const items = useToasts();
  if (items.length === 0) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone ?? 'default'}`} role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
