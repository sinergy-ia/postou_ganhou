"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

type DashboardDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  closeOnBackdrop?: boolean;
};

export default function DashboardDialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-lg",
  closeOnBackdrop = true,
}: DashboardDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-dialog-title"
        className={`w-full ${maxWidthClassName} rounded-[28px] border border-slate-200 bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <h3
              id="dashboard-dialog-title"
              className="font-heading text-2xl font-bold text-slate-900"
            >
              {title}
            </h3>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children ? <div className="p-6">{children}</div> : null}

        {footer ? (
          <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
