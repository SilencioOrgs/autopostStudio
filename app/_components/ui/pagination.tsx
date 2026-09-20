"use client";

import { Icon } from "@/_design-system/icons";

export interface PaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | "ellipsis";

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageNumbers = [1, page - 1, page, page + 1, totalPages]
    .filter((item) => item >= 1 && item <= totalPages)
    .filter((item, index, items) => items.indexOf(item) === index)
    .sort((a, b) => a - b);

  return pageNumbers.reduce<PageItem[]>((items, pageNumber, index) => {
    const previousPage = pageNumbers[index - 1];
    if (previousPage && pageNumber - previousPage > 1) {
      items.push("ellipsis");
    }
    items.push(pageNumber);
    return items;
  }, []);
}

export function Pagination({ page, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems <= pageSize) return null;

  const totalPages = Math.ceil(totalItems / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pageItems = getPageItems(page, totalPages);

  return (
    <nav
      aria-label="Prompt library pagination"
      className="flex flex-col gap-3 px-4 py-3 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        Showing {start}–{end} of {totalItems}
      </span>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs text-foreground transition-colors hover:bg-surface-strong disabled:pointer-events-none disabled:opacity-40"
        >
          <Icon name="chevron_left" size={16} />
          <span>Prev</span>
        </button>

        <div className="hidden items-center gap-1 sm:flex" aria-label={`Page ${page} of ${totalPages}`}>
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1.5 text-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={`h-8 min-w-8 rounded-lg border px-2 text-xs transition-colors ${
                  item === page
                    ? "border-border bg-surface-strong text-foreground"
                    : "border-border text-muted hover:bg-surface-strong hover:text-foreground"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <span className="sm:hidden whitespace-nowrap">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs text-foreground transition-colors hover:bg-surface-strong disabled:pointer-events-none disabled:opacity-40"
        >
          <span>Next</span>
          <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </nav>
  );
}
