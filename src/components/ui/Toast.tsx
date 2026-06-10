import React, { createContext, useContext, useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message: string) => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = (type: ToastType, title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const success = (title: string, message: string) => toast('success', title, message);
  const error = (title: string, message: string) => toast('error', title, message);
  const warning = (title: string, message: string) => toast('warning', title, message);
  const info = (title: string, message: string) => toast('info', title, message);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void; key?: React.Key }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    const interval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / (3000 / 30))));
    }, 30);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgs = {
    success: 'bg-[#161616] border-green-500/20',
    error: 'bg-[#161616] border-red-500/20',
    warning: 'bg-[#161616] border-amber-500/20',
    info: 'bg-[#161616] border-blue-500/20'
  };

  const barColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  };

  return (
    <div 
      className={`relative flex flex-col ${bgs[item.type]} border p-4 rounded-xl shadow-2xl animate-[slideIn_0.2s_ease-out] overflow-hidden`}
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[item.type]}</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white tracking-tight">{item.title}</h4>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">{item.message}</p>
        </div>
        <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors h-fit p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800">
        <div 
          className={`h-full ${barColors[item.type]} transition-all duration-30.ms ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
