"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, type = "info" }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container" aria-live="assertive">
        {toasts.map((t) => {
          const Icon = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertTriangle,
            info: Info
          }[t.type] || Info;

          return (
            <div key={t.id} className={`toast-card toast-${t.type}`}>
              <Icon className="toast-icon" size={18} />
              <div className="toast-content">
                {t.title && <strong className="toast-title">{t.title}</strong>}
                {t.description && <div className="toast-desc">{t.description}</div>}
              </div>
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Close">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
