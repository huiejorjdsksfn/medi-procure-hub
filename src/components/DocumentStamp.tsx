/**
 * EL5 MediProcure — Document Stamp Component v1.0
 * Shared official circular approval stamp for all procurement documents.
 * Renders as a rotated SVG seal showing status, sub-label and date.
 * Used in: Requisitions, PurchaseOrders, GoodsReceived, Vouchers, Tenders, Contracts
 */

export type StampStatus =
  | 'approved' | 'rejected' | 'pending' | 'submitted' | 'received'
  | 'issued'   | 'draft'    | 'ordered' | 'partial'   | 'sent'
  | 'cancelled'| 'published'| 'closed'  | 'awarded'   | 'active' | 'expired';

interface StampCfg { color: string; label: string; subLabel: string; }

const STAMP_CFG: Record<string, StampCfg> = {
  approved:  { color: '#15803d', label: 'APPROVED',  subLabel: 'EL5 Hospital'      },
  rejected:  { color: '#dc2626', label: 'REJECTED',  subLabel: 'EL5 Hospital'      },
  pending:   { color: '#b45309', label: 'PENDING',   subLabel: 'Awaiting Approval' },
  submitted: { color: '#b45309', label: 'SUBMITTED', subLabel: 'For Approval'      },
  received:  { color: '#0369a1', label: 'RECEIVED',  subLabel: 'EL5 Hospital'      },
  issued:    { color: '#4f46e5', label: 'ISSUED',    subLabel: 'EL5 Hospital'      },
  draft:     { color: '#6b7280', label: 'DRAFT',     subLabel: 'Not Submitted'     },
  ordered:   { color: '#0891b2', label: 'ORDERED',   subLabel: 'EL5 Hospital'      },
  partial:   { color: '#7c3aed', label: 'PARTIAL',   subLabel: 'Part Received'     },
  sent:      { color: '#0369a1', label: 'SENT',      subLabel: 'To Supplier'       },
  cancelled: { color: '#9f1239', label: 'CANCELLED', subLabel: 'EL5 Hospital'      },
  published: { color: '#15803d', label: 'PUBLISHED', subLabel: 'Open for Bids'     },
  closed:    { color: '#6b7280', label: 'CLOSED',    subLabel: 'Bids Closed'       },
  awarded:   { color: '#0891b2', label: 'AWARDED',   subLabel: 'Contract Awarded'  },
  active:    { color: '#15803d', label: 'ACTIVE',    subLabel: 'In Force'          },
  expired:   { color: '#dc2626', label: 'EXPIRED',   subLabel: 'Contract Ended'    },
};

interface DocumentStampProps {
  status: string;
  size?: number;
  date?: string;
  rotate?: number;
  opacity?: number;
}

/**
 * DocumentStamp – circular SVG seal that matches the document's approval status.
 * Drop it anywhere in a view modal or print panel.
 */
export function DocumentStamp({
  status,
  size    = 110,
  date,
  rotate  = -15,
  opacity = 1,
}: DocumentStampProps) {
  const cfg     = STAMP_CFG[status] || { color: '#6b7280', label: status.toUpperCase(), subLabel: '' };
  const { color, label, subLabel } = cfg;

  const r1         = size / 2 - 3;
  const r2         = size / 2 - 14;
  const cx         = size / 2;
  const cy         = size / 2;
  const textRadius = (r1 + r2) / 2;
  const chars      = Array.from(label);
  const arcDeg     = Math.min(200, chars.length * 13);
  const startAngle = -90 - arcDeg / 2;
  const stepDeg    = chars.length > 1 ? arcDeg / (chars.length - 1) : 0;
  const toRad      = (d: number) => (d * Math.PI) / 180;

  const dateStr = (() => {
    try {
      const d = date ? new Date(date) : new Date();
      return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
  })();

  return (
    <div style={{
      display: 'inline-block',
      transform: `rotate(${rotate}deg)`,
      opacity,
      filter: `drop-shadow(0 2px 8px ${color}44)`,
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={color} strokeWidth={3} />
        {/* Inner ring */}
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke={color} strokeWidth={1.5} />

        {/* Arced label letters */}
        {chars.map((ch, i) => {
          const angle = startAngle + i * stepDeg;
          const rad   = toRad(angle);
          const x     = cx + textRadius * Math.cos(rad);
          const y     = cy + textRadius * Math.sin(rad);
          return (
            <text key={i} x={x} y={y}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${angle + 90}, ${x}, ${y})`}
              fill={color}
              fontSize={size * 0.115} fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif">
              {ch}
            </text>
          );
        })}

        {/* Horizontal bar */}
        <line
          x1={cx - r2 * 0.7} y1={cy - size * 0.06}
          x2={cx + r2 * 0.7} y2={cy - size * 0.06}
          stroke={color} strokeWidth={1.5}
        />

        {/* Sub-label */}
        {subLabel ? (
          <text x={cx} y={cy + size * 0.04} textAnchor="middle"
            fill={color} fontSize={size * 0.085} fontWeight="700"
            fontFamily="Arial, sans-serif">
            {subLabel}
          </text>
        ) : null}

        {/* Date */}
        {dateStr ? (
          <text x={cx} y={cy + size * 0.2} textAnchor="middle"
            fill={color} fontSize={size * 0.07} fontWeight="600"
            fontFamily="Arial, sans-serif" opacity={0.8}>
            {dateStr}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
