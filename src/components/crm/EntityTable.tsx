"use client";

import type { ReactNode } from "react";

export interface ColunaTabela<T> {
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  thClassName?: string;
  tdClassName?: string;
}

interface EntityTableProps<T> {
  colunas: ColunaTabela<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Classe da divisória entre as linhas do corpo (default: divide-gray-100). */
  divideClassName?: string;
}

export function EntityTable<T>({
  colunas,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage = "Nenhum item encontrado.",
  divideClassName = "divide-gray-100",
}: EntityTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            {colunas.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3${col.align === "right" ? " text-right" : ""}${col.thClassName ? ` ${col.thClassName}` : ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y ${divideClassName}`}>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={onRowClick ? "cursor-pointer hover:bg-gray-50" : "hover:bg-gray-50"}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {colunas.map((col, i) => (
                <td
                  key={i}
                  className={`px-4 py-3${col.align === "right" ? " text-right" : ""}${col.tdClassName ? ` ${col.tdClassName}` : ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={colunas.length}
                className="px-4 py-10 text-center text-sm text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
