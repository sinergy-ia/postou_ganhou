"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  isLoading?: boolean;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  page,
  limit,
  total,
  isLoading = false,
  itemLabel = "itens",
  onPageChange,
}: PaginationControlsProps) {
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startItem = safeTotal === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = safeTotal === 0 ? 0 : Math.min(currentPage * limit, safeTotal);

  if (safeTotal === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="text-sm text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{startItem}</span>-
        <span className="font-semibold text-slate-700">{endItem}</span> de{" "}
        <span className="font-semibold text-slate-700">{safeTotal}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          Página {currentPage} de {totalPages}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
