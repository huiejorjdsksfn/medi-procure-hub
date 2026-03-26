/**
 * ProcurBosse — Universal Form Renderer
 * Renders forms from FORM_FIELDS definitions
 * Shared across Requisitions, PO, GRN, Vouchers, Suppliers, Tenders
 */
import React from "react";
import { FormField } from "./index";

interface FormRendererProps {
  fields:    FormField[];
  values:    Record<string, any>;
  onChange:  (key: string, value: any) => void;
  options?:  Record<string, string[]>;  // key -> option list from DB
  disabled?: boolean;
  columns?:  1 | 2 | 3;
}

const INP: React.CSSProperties = {
  width:"100%", padding:"8px 10px", border:"1.5px solid #e2e8f0",
  borderRadius:7, fontSize:12.5, outline:"none", background:"#fff",
  color:"#1e293b", boxSizing:"border-box",
};
const LBL: React.CSSProperties = {
  display:"block", fontSize:9.5, fontWeight:700,
  textTransform:"uppercase", letterSpacing:"0.06em",
  color:"#64748b", marginBottom:4,
};

export function renderField(
  field: FormField,
  value: any,
  onChange: (k: string, v: any) => void,
  options?: string[],
  disabled?: boolean,
): React.ReactNode {
  const props = { disabled, style: INP };

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
      return (
        <input
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={value || ""}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
          {...props}
        />
      );

    case "number":
    case "currency":
      return (
        <input
          type="number"
          value={value || ""}
          onChange={e => onChange(field.key, e.target.value)}
          step={field.type === "currency" ? "0.01" : "1"}
          min={0}
          placeholder="0.00"
          required={field.required}
          {...props}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={value || ""}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          {...props}
        />
      );

    case "textarea":
      return (
        <textarea
          value={value || ""}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
          rows={3}
          style={{ ...INP, resize:"vertical" }}
          disabled={disabled}
        />
      );

    case "select":
      return (
        <select
          value={value || ""}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          {...props}
        >
          <option value="">— Select —</option>
          {(options || field.options || []).map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );

    case "checkbox":
      return (
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:disabled?"default":"pointer" }}>
          <input
            type="checkbox"
            checked={value === true || value === "true"}
            onChange={e => onChange(field.key, e.target.checked ? "true" : "false")}
            disabled={disabled}
            style={{ width:16, height:16, accentColor:"#0a2558" }}
          />
          <span style={{ fontSize:12.5, color:"#374151" }}>{field.label}</span>
        </label>
      );

    default:
      return null;
  }
}

export function FormRenderer({
  fields, values, onChange, options = {}, disabled = false, columns = 2,
}: FormRendererProps) {
  const grid = columns === 1 ? "1fr" : columns === 3 ? "1fr 1fr 1fr" : "1fr 1fr";

  return (
    <div style={{ display:"grid", gridTemplateColumns:grid, gap:12 }}>
      {fields.map(f => (
        <div key={f.key}
          style={{ gridColumn: f.type === "textarea" ? "1 / -1" : undefined }}>
          {f.type !== "checkbox" && (
            <label style={LBL}>
              {f.label}
              {f.required && <span style={{ color:"#dc2626", marginLeft:2 }}>*</span>}
            </label>
          )}
          {renderField(f, values[f.key], onChange, options[f.key], disabled)}
        </div>
      ))}
    </div>
  );
}
