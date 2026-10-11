"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
  type = "warning",
}: ConfirmDialogProps) {
  const colorClasses = {
    danger: {
      button: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500",
      icon: "text-red-600",
    },
    warning: {
      button:
        "bg-yellow-600 hover:bg-yellow-700 text-white focus-visible:ring-yellow-500",
      icon: "text-yellow-600",
    },
    info: {
      button: "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500",
      icon: "text-blue-600",
    },
  };

  const colors = colorClasses[type];
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
    }

    if (event.key === "Tab" && event.shiftKey) {
      // keep focus inside the dialog when using shift+tab
      if (document.activeElement === cancelButtonRef.current) {
        event.preventDefault();
        confirmButtonRef.current?.focus();
      }
    } else if (event.key === "Tab" && !event.shiftKey) {
      if (document.activeElement === confirmButtonRef.current) {
        event.preventDefault();
        cancelButtonRef.current?.focus();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 z-[9998]"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            onClick={(event) => event.stopPropagation()}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            <div className="w-full max-w-md border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6 text-[var(--cw-ink)] shadow-xl pointer-events-auto">
              {/* Header */}
              <div className="mb-3 flex items-center gap-3">
                <AlertTriangle className={`h-6 w-6 shrink-0 ${colors.icon}`} aria-hidden="true" />
                <h3 id={titleId} className="min-w-0 flex-1 font-serif text-xl leading-snug text-[var(--cw-ink)]">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="shrink-0 rounded-full p-1 text-[var(--cw-muted)] transition-colors hover:text-[var(--cw-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cw-accent)]"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Message */}
              <p id={descriptionId} className="mb-6 pl-9 text-sm leading-6 text-[var(--cw-body)]">
                {message}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={onCancel}
                  className="flex-1 border border-[var(--cw-border)] bg-transparent px-4 py-3 text-[var(--cw-ink)] transition-colors hover:border-[var(--cw-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cw-accent)]"
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={onConfirm}
                  className={`flex-1 px-4 py-3 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${colors.button}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

