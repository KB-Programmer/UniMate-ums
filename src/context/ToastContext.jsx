import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback((type, title, message) => {
    const id = ++counter;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, type === "error" ? 6500 : 4200);
    return id;
  }, []);

  const api = useMemo(
    () => ({
      toast,
      success: (title, message) => toast("success", title, message),
      error: (title, message) => toast("error", title, message),
      info: (title, message) => toast("info", title, message),
      warning: (title, message) => toast("warning", title, message),
      dismiss,
    }),
    [toast, dismiss]
  );

  const icons = {
    success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />,
    info: <Info size={18} />, warning: <AlertCircle size={18} />,
  };
  const colors = {
    success: "text-[var(--success)] bg-[var(--success-soft)]",
    error: "text-[var(--danger)] bg-[var(--danger-soft)]",
    info: "text-[var(--info)] bg-[var(--info-soft)]",
    warning: "text-[var(--warning)] bg-[var(--warning-soft)]",
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-lg animate-[toastIn_.2s_ease-out]"
          >
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors[t.type]}`}>{icons[t.type]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text)]">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{t.message}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="rounded-md p-1 text-[var(--faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
