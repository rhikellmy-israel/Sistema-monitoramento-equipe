import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "../lib/utils";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage = 25,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2",
        className
      )}
    >
      {/* Info */}
      <p className="text-xs font-bold text-slate-400 tracking-wide order-2 sm:order-1">
        Exibindo{" "}
        <span className="text-slate-600">
          {startItem}–{endItem}
        </span>{" "}
        de <span className="text-slate-600">{totalItems}</span> registros
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold",
            currentPage === 1
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
          )}
          title="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold",
            currentPage === 1
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
          )}
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold select-none"
            >
              ···
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold",
                currentPage === page
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
              )}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold",
            currentPage === totalPages
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
          )}
          title="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold",
            currentPage === totalPages
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
          )}
          title="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
