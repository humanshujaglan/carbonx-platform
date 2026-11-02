"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CloseCircle } from "iconsax-react";

/** Controlled bottom sheet: backdrop, slide-up panel, Escape / backdrop / X to close. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-t-3xl border border-white/[0.08] bg-panel p-5 pb-8 sm:p-6 sm:pb-8 text-text shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-white/15" />
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-muted transition hover:text-white cursor-pointer"
              >
                <CloseCircle size={22} color="currentColor" variant="Linear" />
              </button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto text-xs leading-relaxed text-muted">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Question-mark button that opens a bottom sheet with the card's description and calculations. */
export function InfoSheet({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`About ${title}`}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-neon cursor-pointer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9.25a2.5 2.5 0 1 1 3.6 2.25c-.75.4-1.1.95-1.1 1.75" />
          <path d="M12 16.75h.01" strokeWidth="2" />
        </svg>
      </button>
      <BottomSheet open={open} onClose={close} title={title}>
        {children}
      </BottomSheet>
    </>
  );
}

export function SheetBlock({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="well !rounded-xl p-3.5">
      {title && <div className="mb-1 text-2xs font-semibold text-muted">{title}</div>}
      {children}
    </div>
  );
}
