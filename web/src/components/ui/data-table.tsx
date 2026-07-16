import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * DataTable — the net-new primitive hi2vi_web lacks (P12.S1), re-skinned to the
 * Knowledge Base console `.kb-dtable` (P12.S2R): mono uppercase headers on a
 * sunken warm band, hairline rows, teal-soft hover. The dashboard's projects /
 * credentials / documents lists all render tabular data, so this is a headless,
 * token-styled table:
 *
 *  - typed `columns` (a header + a per-row `cell` renderer),
 *  - `rows` + a stable `rowKey`,
 *  - the `.kb-dtable` chrome (border, radius, overflow-x scroll),
 *  - an empty-state row (`empty`) spanning all columns (`.kb-dtable__empty`),
 *  - alignment helpers — right-aligned actions/numeric columns; pass `className`
 *    `"num"` / `"mono"` for tabular-nums / mono figures.
 *
 * Purely presentational: all data arrives as props — it never fetches. Later
 * slices (S3/S4/S5) pass server-fetched rows straight in.
 */
export interface DataTableColumn<T> {
  /** Stable column key (also the React key for header/cell nodes). */
  key: string;
  /** Header cell content. */
  header: ReactNode;
  /** Renders the cell for one row. */
  cell: (row: T, index: number) => ReactNode;
  /**
   * Horizontal alignment. Defaults to `left` — or `right` when `actions` is set
   * (actions/numeric columns sit at the trailing edge).
   */
  align?: "left" | "right" | "center";
  /** Marks this as the trailing actions column (right-aligned, tighter). */
  actions?: boolean;
  /** Extra classes applied to this column's header + cells (e.g. `num` / `mono`). */
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Stable key for each row. */
  rowKey: (row: T, index: number) => string;
  /** Shown (spanning every column) when `rows` is empty. Defaults to a note. */
  empty?: ReactNode;
  /** Extra classes on the `.kb-dtable` wrapper. */
  className?: string;
}

const alignClass: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "",
  right: "right",
  center: "text-center",
};

function resolveAlign<T>(col: DataTableColumn<T>): string {
  return alignClass[col.align ?? (col.actions ? "right" : "left")];
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "No items to display.",
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("kb-dtable", className)}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(resolveAlign(col), col.className) || undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="kb-dtable__empty">
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(resolveAlign(col), col.className) || undefined}
                  >
                    {col.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
