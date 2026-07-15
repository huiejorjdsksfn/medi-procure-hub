/**
 * ProcurBosse — ERP Wheel (Dynamics-365 style radial navigator)
 * Pure-SVG circular navigator: 10 segments around a hub, each opens a module.
 * Used on the main dashboard and Finance Desktop.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, TrendingUp, Package, Truck, DollarSign, FileText,
  Users, Shield, Layers, Radio, ClipboardList,
} from "lucide-react";

export interface WheelSegment {
  id: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  path: string;
  roles?: string[];
}

const DEFAULT_SEGMENTS: WheelSegment[] = [
  { id: "requisitions",   label: "Requisitions",  color: "#1B5CA8", icon: ClipboardList, path: "/requisitions" },
  { id: "procurement",    label: "Procurement",   color: "#1E6BB8", icon: ShoppingCart,  path: "/purchase-orders" },
  { id: "inventory",      label: "Inventory",     color: "#227AC5", icon: Package,       path: "/items" },
  { id: "suppliers",      label: "Suppliers",     color: "#2789D0", icon: Truck,         path: "/suppliers" },
  { id: "finance",        label: "Finance",       color: "#2C98DC", icon: DollarSign,    path: "/finance-dashboard" },
  { id: "reports",        label: "Reports & BI",  color: "#1E6BB8", icon: TrendingUp,    path: "/reports" },
  { id: "documents",      label: "Documents",     color: "#1B5CA8", icon: FileText,      path: "/documents" },
  { id: "quality",        label: "Quality",       color: "#194F94", icon: Shield,        path: "/quality/dashboard" },
  { id: "users",          label: "People",        color: "#16447F", icon: Users,         path: "/users" },
  { id: "comms",          label: "Comms",         color: "#133A6D", icon: Radio,         path: "/communications" },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function annularSlice(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number) {
  const p1 = polar(cx, cy, rOut, a0);
  const p2 = polar(cx, cy, rOut, a1);
  const p3 = polar(cx, cy, rIn,  a1);
  const p4 = polar(cx, cy, rIn,  a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y}
          A ${rOut} ${rOut} 0 ${large} 1 ${p2.x} ${p2.y}
          L ${p3.x} ${p3.y}
          A ${rIn} ${rIn} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

interface Props {
  size?: number;
  title?: string;
  subtitle?: string;
  segments?: WheelSegment[];
  roles?: string[];
  onSegmentClick?: (seg: WheelSegment) => void;
}

export default function ERPWheel({
  size = 520,
  title = "ProcurBosse",
  subtitle = "MediProcure",
  segments = DEFAULT_SEGMENTS,
  roles,
  onSegmentClick,
}: Props) {
  const nav = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!roles || roles.length === 0) return segments;
    return segments.filter(s => !s.roles || s.roles.length === 0 || s.roles.some(r => roles.includes(r)));
  }, [segments, roles]);

  const n = visible.length || 1;
  const cx = size / 2;
  const cy = size / 2;
  const rOut = size * 0.48;
  const rIn  = size * 0.24;
  const step = 360 / n;
  const gap  = 1.2; // degrees between slices

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: size, aspectRatio: "1 / 1", margin: "0 auto" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <radialGradient id="wheel-hub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="90%" stopColor="#f2f6fb" />
            <stop offset="100%" stopColor="#dfe7f2" />
          </radialGradient>
          <filter id="wheel-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
          </filter>

          {/* Procurement wallpaper — tiled crates / pallet / barcode / supply-line motif */}
          <pattern id="procurement-wallpaper" width={64} height={64} patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <rect width={64} height={64} fill="#0f2c5c" />
            {/* shipping crate */}
            <g stroke="#5c8fc9" strokeWidth={1} fill="none" opacity={0.55}>
              <rect x={6} y={8} width={16} height={14} rx={1} />
              <path d="M6 15 H22 M14 8 V22" />
            </g>
            {/* pallet */}
            <g stroke="#5c8fc9" strokeWidth={1} fill="none" opacity={0.4}>
              <path d="M32 40 H50 M32 44 H50 M32 48 H50" />
              <path d="M34 40 V48 M40 40 V48 M46 40 V48" />
            </g>
            {/* barcode */}
            <g fill="#5c8fc9" opacity={0.35}>
              <rect x={40} y={6} width={1.5} height={10} />
              <rect x={43} y={6} width={1} height={10} />
              <rect x={45.5} y={6} width={2} height={10} />
              <rect x={49} y={6} width={1} height={10} />
              <rect x={51} y={6} width={1.5} height={10} />
            </g>
            {/* dolly / cart */}
            <g stroke="#5c8fc9" strokeWidth={1} fill="none" opacity={0.4}>
              <path d="M6 46 H18 L20 58 H8 Z" />
              <circle cx={10} cy={60} r={1.6} />
              <circle cx={17} cy={60} r={1.6} />
            </g>
            {/* supply-chain connector line */}
            <path d="M0 32 H64" stroke="#5c8fc9" strokeWidth={0.6} opacity={0.2} strokeDasharray="2 4" />
          </pattern>
          <radialGradient id="wallpaper-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f2c5c" stopOpacity={0.35} />
            <stop offset="75%" stopColor="#0f2c5c" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#0f2c5c" stopOpacity={0.92} />
          </radialGradient>
        </defs>

        {/* procurement wallpaper backdrop, clipped to the wheel's footprint */}
        <circle cx={cx} cy={cy} r={rOut + 2} fill="url(#procurement-wallpaper)" />
        <circle cx={cx} cy={cy} r={rOut + 2} fill="url(#wallpaper-fade)" />
        {/* outer ring backdrop */}
        <circle cx={cx} cy={cy} r={rOut + 2} fill="#0f2c5c" opacity={0.05} />

        {visible.map((seg, i) => {
          const a0 = i * step + gap / 2;
          const a1 = (i + 1) * step - gap / 2;
          const mid = (a0 + a1) / 2;
          const rMid = (rIn + rOut) / 2;
          const iconP = polar(cx, cy, rMid + 6, mid);
          const labelP = polar(cx, cy, rMid - 22, mid);
          const isHover = hover === seg.id;
          const Icon = seg.icon;
          return (
            <g key={seg.id}
               style={{ cursor: "pointer", transition: "transform .2s ease" }}
               transform={isHover ? `translate(${(iconP.x - cx) * 0.02} ${(iconP.y - cy) * 0.02})` : undefined}
               onMouseEnter={() => setHover(seg.id)}
               onMouseLeave={() => setHover(null)}
               onClick={() => (onSegmentClick ? onSegmentClick(seg) : nav(seg.path))}>
              <path d={annularSlice(cx, cy, rIn, rOut, a0, a1)}
                    fill={seg.color}
                    opacity={isHover ? 1 : 0.92}
                    filter="url(#wheel-shadow)"
                    stroke="#0a244f" strokeWidth={0.6} />
              <foreignObject x={iconP.x - 18} y={iconP.y - 18} width={36} height={36} pointerEvents="none">
                <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Icon size={22} color="#fff" />
                </div>
              </foreignObject>
              <text x={labelP.x} y={labelP.y}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#ffffff" fontSize={10.5} fontWeight={700}
                    style={{ letterSpacing: ".04em", pointerEvents: "none",
                             textTransform: "uppercase",
                             fontFamily: "'Segoe UI','IBM Plex Sans',sans-serif" }}>
                {seg.label}
              </text>
            </g>
          );
        })}

        {/* hub */}
        <circle cx={cx} cy={cy} r={rIn - 4} fill="url(#wheel-hub)" stroke="#c9d5e6" strokeWidth={1} filter="url(#wheel-shadow)" />
        <text x={cx} y={cy - 14} textAnchor="middle" fill="#1B5CA8" fontSize={14} fontWeight={800}
              style={{ letterSpacing: ".05em", fontFamily: "'Segoe UI','IBM Plex Sans',sans-serif" }}>ERP</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#0f2c5c" fontSize={18} fontWeight={800}
              style={{ fontFamily: "'Segoe UI','IBM Plex Sans',sans-serif" }}>{title}</text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill="#1B5CA8" fontSize={11} fontWeight={600}
              style={{ letterSpacing: ".08em", fontFamily: "'Segoe UI','IBM Plex Sans',sans-serif" }}>{subtitle.toUpperCase()}</text>
      </svg>
    </div>
  );
}
