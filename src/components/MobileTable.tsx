/**
 * EL5 MediProcure — MobileTable v1.0
 * Responsive table: desktop = classic ERP grid, mobile = stacked cards
 */
import React from "react";
import { erpStyles, ERP } from "@/lib/erpTheme";
import { useIsMobile } from "@/hooks/useIsMobile";

export interface MobileTableCol<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T, i: number) => React.ReactNode;
  mobileLabel?: string;
  /** If true, acts as the card title on mobile */
  primary?: boolean;
  mobileHide?: boolean;
  thStyle?: React.CSSProperties;
  tdStyle?: React.CSSProperties;
}

interface MobileTableProps<T> {
  cols: MobileTableCol<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  rowKey: (row: T) => string;
  maxHeight?: string | number;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
}

export function MobileTable<T>({
  cols, rows, loading, emptyText = "No records found",
  rowKey, maxHeight, onRowClick, stickyHeader = true,
}: MobileTableProps<T>) {
  const isMobile = useIsMobile();

  function getCellVal(row: T, col: MobileTableCol<T>): React.ReactNode {
    if (col.render) return col.render(row, 0);
    const v = (row as any)[col.key];
    return v == null ? "—" : String(v);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888", fontFamily: ERP.fontFamily, fontSize: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
        Loading...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontFamily: ERP.fontFamily, fontSize: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
        {emptyText}
      </div>
    );
  }

  /* ─── Mobile: stacked card layout ─────────────────────── */
  if (isMobile) {
    return (
      <div style={{ padding: "6px 4px" }}>
        {rows.map((row, i) => {
          const primaryCol = cols.find(c => c.primary) || cols[0];
          return (
            <div
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              style={{
                background: i % 2 === 0 ? "#fff" : "#f9f9f9",
                border: "1px solid #d0d0d0",
                borderRadius: 4,
                marginBottom: 6,
                padding: "8px 10px",
                fontFamily: ERP.fontFamily,
                cursor: onRowClick ? "pointer" : "default",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {/* Card header — primary field */}
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1a3580", marginBottom: 6, borderBottom: "1px solid #eee", paddingBottom: 4 }}>
                {getCellVal(row, primaryCol)}
              </div>
              {/* Remaining fields as label: value pairs */}
              {cols.filter(c => !c.primary && !c.mobileHide).map(col => (
                <div key={String(col.key)} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 11 }}>
                  <span style={{ color: "#888", fontWeight: 600, minWidth: 100 }}>{col.mobileLabel || col.label}</span>
                  <span style={{ color: "#1a1a1a", textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>
                    {getCellVal(row, col)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  /* ─── Desktop: traditional table ──────────────────────── */
  return (
    <div style={{ overflow: "auto", maxHeight: maxHeight }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={stickyHeader ? { position: "sticky", top: 0, zIndex: 10 } : {}}>
          <tr>
            {cols.map(col => (
              <th key={String(col.key)} style={{ ...erpStyles.gridTh, ...col.thStyle }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              style={{ background: i % 2 === 0 ? "#fff" : "#f7f7f7", cursor: onRowClick ? "pointer" : "default" }}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={e => (e.currentTarget.style.background = "#dce9ff")}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f7f7f7")}
            >
              {cols.map(col => (
                <td key={String(col.key)} style={{ ...erpStyles.gridTd, ...col.tdStyle }}>
                  {getCellVal(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
