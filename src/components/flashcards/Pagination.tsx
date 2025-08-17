import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationProps } from "./types";

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Pokaż wszystkie strony
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logika dla większej liczby stron
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageClick = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== page) {
      onPageChange(pageNum);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button variant="outline" size="sm" onClick={() => handlePageClick(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" />
        Poprzednia
      </Button>

      <div className="flex items-center space-x-1">
        {getVisiblePages().map((pageNum, index) => (
          <div key={index}>
            {pageNum === "..." ? (
              <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
            ) : (
              <Button
                variant={pageNum === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageClick(pageNum as number)}
                className="w-8 h-8 p-0"
              >
                {pageNum}
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => handlePageClick(page + 1)} disabled={page >= totalPages}>
        Następna
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
