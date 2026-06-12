import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  noScroll?: boolean;
}

export function Drawer({ isOpen, onClose, title, children, width = 'max-w-md', noScroll = false }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay Backdrop */}
      <div
        className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <div
          ref={drawerRef}
          className={`w-screen ${width} bg-[#111111] border-l border-white/8 shadow-2xl flex flex-col transition-transform duration-300 ease-out translate-x-0 transform animate-slide-left`}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between bg-[#161616]">
            <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-500 hover:text-white hover:bg-white/5 transition-all active:scale-95"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className={`flex-1 flex flex-col ${noScroll ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
