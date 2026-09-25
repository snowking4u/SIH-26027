import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

export interface DataTableColumn<T> {
  /** Stable key used for the header label/id. */
  key: string;
  header: ReactNode;
  /** Optional custom renderer for the cell. */
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  headerClassName?: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyField: (row: T) => string | number;
  loading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** Rendered above the table (title / tooling). */
  toolbar?: ReactNode;
  className?: string;
}

/** Generic read-only data table with built-in loading and empty states. */
export function DataTable<T>({
  columns,
  rows,
  keyField,
  loading,
  emptyIcon,
  emptyTitle = "No data loaded",
  emptyDescription,
  emptyAction,
  toolbar,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface-white shadow-card", className)}>
      {toolbar ? <div className="border-b border-line px-4 py-3">{toolbar}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    className="m-4 border-transparent bg-transparent"
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={keyField(row)} className="transition-colors hover:bg-surface-muted/60">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 align-middle text-ink",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.className,
                      )}
                    >
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}