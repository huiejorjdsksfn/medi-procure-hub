/**
 * EL5 MediProcure — DocumentStamp v3.0
 * Realistic circular rubber stamp with ink-distress SVG filter,
 * curved top/bottom text, day/month/year date block, and optional
 * worn-ink texture. Used across all procurement documents.
 */
import { useStampOverrides } from "@/hooks/useStampOverrides";

export type StampStatus =
  | 'approved' | 'rejected' | 'pending' | 'submitted' | 'received'
  | 'issued'   | 'draft'    | 'ordered' | 'partial'   | 'sent'
  | 'cancelled'| 'published'| 'closed'  | 'awarded'   | 'active'
  | 'expired'  | 'verified' | 'official' | 'confidential' | 'urgent';

interface StampCfg {
  ink:         string;   // main ink colour (kept for the drop-shadow glow tint)
  label:       string;   // big centre word
  topArc:      string;   // text curved along top ring
  botArc:      string;   // text curved along bottom ring
  star?:       boolean;  // show ★ decorators
  ringColor?:  string;   // outer ring + institution-name arc colour (default: brand blue)
  labelColor?: string;   // centre label + date block colour (default: brand red)
  imageUrl?:   string;   // admin-uploaded stamp image — replaces the vector stamp entirely when set
}

/* Two-tone official stamp ink — outer ring/institution name in blue,
   centre label/date in red, matching a classic notary/embassy seal. */
const STAMP_BLUE = '#0a3d8f';
const STAMP_RED  = '#c81e2c';

const CFG: Record<string, StampCfg> = {
  approved:     { ink:'#0d4f1c', label:'APPROVED',     topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'PROCUREMENT AUTHORITY', star:true  },
  rejected:     { ink:'#8b0000', label:'REJECTED',     topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'NOT APPROVED',          star:false },
  pending:      { ink:'#7a3e00', label:'PENDING',      topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'AWAITING APPROVAL',     star:false },
  submitted:    { ink:'#7a3e00', label:'SUBMITTED',    topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'FOR REVIEW',            star:false },
  received:     { ink:'#003366', label:'RECEIVED',     topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'GOODS & SERVICES',      star:true  },
  issued:       { ink:'#2e006b', label:'ISSUED',       topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'FINANCE DEPARTMENT',    star:true  },
  draft:        { ink:'#3d3d3d', label:'DRAFT',        topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'NOT FINAL',             star:false },
  ordered:      { ink:'#004a5c', label:'ORDERED',      topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'PROCUREMENT DEPT',      star:true  },
  partial:      { ink:'#4a006b', label:'PARTIAL',      topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'PARTIALLY RECEIVED',    star:false },
  sent:         { ink:'#003366', label:'SENT',         topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'TO SUPPLIER',           star:false },
  cancelled:    { ink:'#6b0000', label:'CANCELLED',    topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'VOID — NOT VALID',      star:false },
  published:    { ink:'#0d4f1c', label:'PUBLISHED',    topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'OPEN FOR BIDS',         star:true  },
  closed:       { ink:'#3d3d3d', label:'CLOSED',       topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'BIDDING CLOSED',        star:false },
  awarded:      { ink:'#003366', label:'AWARDED',      topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'CONTRACT AWARDED',      star:true  },
  active:       { ink:'#0d4f1c', label:'ACTIVE',       topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'IN FORCE',              star:true  },
  expired:      { ink:'#8b0000', label:'EXPIRED',      topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'CONTRACT ENDED',        star:false },
  verified:     { ink:'#003d6b', label:'VERIFIED',     topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'QUALITY VERIFIED',      star:true  },
  official:     { ink:'#1a006b', label:'OFFICIAL',     topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'OFFICIAL USE ONLY',     star:true  },
  confidential: { ink:'#4a006b', label:'CONFIDENTIAL', topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'RESTRICTED ACCESS',     star:false },
  urgent:       { ink:'#8b2800', label:'URGENT',       topArc:'EMBU LEVEL 5 HOSPITAL',  botArc:'IMMEDIATE ACTION',      star:false },
};

/* ── Arc-text helper ─────────────────────────────────────────────────── */
function ArcText({
  text, cx, cy, r, startDeg, endDeg, flip = false,
  fontSize, ink, bold = false,
}: {
  text: string; cx: number; cy: number; r: number;
  startDeg: number; endDeg: number; flip?: boolean;
  fontSize: number; ink: string; bold?: boolean;
}) {
  const chars  = Array.from(text);
  const total  = endDeg - startDeg;
  const step   = chars.length > 1 ? total / (chars.length - 1) : 0;
  const toRad  = (d: number) => (d * Math.PI) / 180;
  return (
    <>
      {chars.map((ch, i) => {
        const angle = startDeg + i * step;
        const rad   = toRad(angle);
        const x     = cx + r * Math.cos(rad);
        const y     = cy + r * Math.sin(rad);
        const rot   = flip ? angle - 90 : angle + 90;
        return (
          <text key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(${rot},${x},${y})`}
            fill={ink} fontSize={fontSize}
            fontWeight={bold ? '900' : '700'}
            fontFamily="'Arial Black',Arial,sans-serif"
            letterSpacing="0">
            {ch}
          </text>
        );
      })}
    </>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
interface DocumentStampProps {
  status:   string;
  size?:    number;
  date?:    string;
  rotate?:  number;
  opacity?: number;
  worn?:    boolean;   // ink-distress texture
  approvedBy?: string;
  /** Used only by the Stamp Design Studio's own live-editing preview to
   *  show unsaved changes — takes precedence over CFG and saved overrides.
   *  Every other call site across the app should leave this unset. */
  previewOverride?: Partial<StampCfg>;
}

export function DocumentStamp({
  status,
  size    = 140,
  date,
  rotate  = -15,
  opacity = 1,
  worn    = true,
  approvedBy,
  previewOverride,
}: DocumentStampProps) {
  const overrides = useStampOverrides();
  const base = CFG[status.toLowerCase()] ?? {
    ink: '#3d3d3d', label: status.toUpperCase(),
    topArc: 'EMBU LEVEL 5 HOSPITAL', botArc: 'OFFICIAL', star: false,
  };
  const cfg = { ...base, ...(overrides[status.toLowerCase()] || {}), ...(previewOverride || {}) };
  // label/topArc/botArc/star/ringColor/labelColor/imageUrl are all fully
  // customizable from the Stamp Design Studio (or live, while editing,
  // via previewOverride). `ink` itself only feeds the drop-shadow glow —
  // the rings/label/date below use ringColor/labelColor, which default to
  // the brand blue/red two-tone when not explicitly overridden.
  const { ink, label, topArc, botArc, star, imageUrl } = cfg;
  const ringColor  = cfg.ringColor  || STAMP_BLUE;
  const labelColor = cfg.labelColor || STAMP_RED;

  /* geometry */
  const cx   = size / 2;
  const cy   = size / 2;
  const rOut = size / 2 - 4;          // outermost ring
  const rIn1 = rOut - 10;             // text track outer edge
  const rIn2 = rIn1 - 10;             // text track inner edge / inner ring
  const rMid = (rIn1 + rIn2) / 2;    // midline of text track

  /* date breakdown */
  const d    = date ? new Date(date) : new Date();
  const DAY  = String(d.getDate()).padStart(2, '0');
  const MON  = d.toLocaleString('en-KE', { month: 'short' }).toUpperCase();
  const YEAR = d.getFullYear();

  const filterId = `stamp-ink-${status}`;
  const fs       = size * 0.068;   // arc font size
  const fsLabel  = size * 0.145;   // main label font
  const fsDate   = size * 0.088;   // date numbers
  const fsMon    = size * 0.075;   // month text
  const lineW    = size * 0.012;

  /* arc angles: top text 210°→-30° (upper half), bottom text 30°→150° (lower half) */
  const topStart = -210, topEnd = -30;   // upper arc  (-210 to -30 in screen coords)
  const botStart =   30, botEnd = 150;   // lower arc  (30 to 150)

  /* Admin-uploaded custom stamp image — bypasses the generated vector
     stamp entirely when set, both here and at print time. */
  if (imageUrl) {
    return (
      <div style={{
        display: 'inline-block',
        transform: `rotate(${rotate}deg)`,
        opacity,
        userSelect: 'none',
        pointerEvents: 'none',
        filter: `drop-shadow(0 3px 12px ${ink}55)`,
      }}>
        <img src={imageUrl} alt={`${label} stamp`}
          width={size} height={size}
          style={{ width: size, height: size, objectFit: 'contain' }} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-block',
      transform: `rotate(${rotate}deg)`,
      opacity,
      userSelect: 'none',
      pointerEvents: 'none',
      filter: `drop-shadow(0 3px 12px ${ink}55)`,
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg">

        {/* ── Ink-distress filter ── */}
        {worn && (
          <defs>
            <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3"
                stitchTiles="stitch" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise"
                scale={size * 0.018} xChannelSelector="R" yChannelSelector="G"
                result="displaced" />
              <feComposite in="displaced" in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
        )}

        <g filter={worn ? `url(#${filterId})` : undefined}>

          {/* ── Outer double ring (blue) ── */}
          <circle cx={cx} cy={cy} r={rOut}  fill="none" stroke={ringColor} strokeWidth={size * 0.026} />
          <circle cx={cx} cy={cy} r={rOut - size * 0.038} fill="none" stroke={ringColor} strokeWidth={size * 0.012} />

          {/* ── Inner ring (red) ── */}
          <circle cx={cx} cy={cy} r={rIn2}  fill="none" stroke={labelColor} strokeWidth={size * 0.012} />

          {/* ── Top arc text (blue) ── */}
          <ArcText text={topArc} cx={cx} cy={cy} r={rMid}
            startDeg={topStart} endDeg={topEnd}
            fontSize={fs} ink={ringColor} bold />

          {/* ── Bottom arc text (blue) ── */}
          <ArcText text={botArc} cx={cx} cy={cy} r={rMid}
            startDeg={botStart} endDeg={botEnd} flip
            fontSize={fs} ink={ringColor} bold />

          {/* ── Stars at sides (blue) ── */}
          {star && (
            <>
              {[-1, 1].map(side => {
                const sx = cx + side * (rMid);
                return (
                  <text key={side} x={sx} y={cy} textAnchor="middle"
                    dominantBaseline="middle" fill={ringColor}
                    fontSize={fs * 1.1} fontWeight="900"
                    fontFamily="Arial, sans-serif">★</text>
                );
              })}
            </>
          )}

          {/* ── Main label (red) ── */}
          <text x={cx} y={cy - size * 0.13}
            textAnchor="middle" dominantBaseline="middle"
            fill={labelColor} fontSize={fsLabel} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif"
            letterSpacing={size * 0.004}>
            {label}
          </text>

          {/* ── Divider lines (red) ── */}
          <line x1={cx - rIn2 * 0.72} y1={cy - size * 0.028}
                x2={cx + rIn2 * 0.72} y2={cy - size * 0.028}
                stroke={labelColor} strokeWidth={lineW} />
          <line x1={cx - rIn2 * 0.72} y1={cy + size * 0.13}
                x2={cx + rIn2 * 0.72} y2={cy + size * 0.13}
                stroke={labelColor} strokeWidth={lineW} />

          {/* ── Date block: DAY  |  MON  |  YEAR (red) ── */}
          {/* vertical separators */}
          <line x1={cx - size * 0.055} y1={cy - size * 0.025}
                x2={cx - size * 0.055} y2={cy + size * 0.125}
                stroke={labelColor} strokeWidth={lineW * 0.8} />
          <line x1={cx + size * 0.055} y1={cy - size * 0.025}
                x2={cx + size * 0.055} y2={cy + size * 0.125}
                stroke={labelColor} strokeWidth={lineW * 0.8} />

          {/* DAY */}
          <text x={cx - size * 0.165} y={cy + size * 0.052}
            textAnchor="middle" dominantBaseline="middle"
            fill={labelColor} fontSize={fsDate} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif">
            {DAY}
          </text>

          {/* MON */}
          <text x={cx} y={cy + size * 0.052}
            textAnchor="middle" dominantBaseline="middle"
            fill={labelColor} fontSize={fsMon} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif">
            {MON}
          </text>

          {/* YEAR */}
          <text x={cx + size * 0.165} y={cy + size * 0.052}
            textAnchor="middle" dominantBaseline="middle"
            fill={labelColor} fontSize={fsDate * 0.82} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif">
            {YEAR}
          </text>

          {/* ── Approved-by (small, below date, red) ── */}
          {approvedBy && (
            <text x={cx} y={cy + size * 0.185}
              textAnchor="middle" dominantBaseline="middle"
              fill={labelColor} fontSize={size * 0.058} fontWeight="700"
              fontFamily="Arial,sans-serif" opacity={0.85}>
              {approvedBy.substring(0, 18).toUpperCase()}
            </text>
          )}

        </g>
      </svg>
    </div>
  );
}

/* ── Quick-stamp modal / trigger for admin & manager panels ─────────── */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotification } from '@/lib/notify';
import { T, d365Btn, statusBadge } from '@/lib/theme';
import BrandConfirmation from '@/components/BrandConfirmation';

const db = supabase as any;

interface QuickStampButtonProps {
  label?:   string;
  size?:    'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline';
}

export function QuickStampButton({
  label   = 'Stamp Document',
  size    = 'md',
  variant = 'primary',
}: QuickStampButtonProps) {
  const { user, profile } = useAuth();
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState<'req'|'po'|'grn'>('req');
  const [docs, setDocs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [stamping, setStamping] = useState<string|null>(null);
  const [error, setError]       = useState<string|null>(null);
  const [confirm, setConfirm]   = useState<{ title: string; message: string } | null>(null);

  const pad: Record<string, string> = {
    sm:  '5px 12px', md: '8px 18px', lg: '10px 24px',
  };
  const fs: Record<string, number> = { sm: 11, md: 13, lg: 14 };

  const btnStyle: React.CSSProperties = variant === 'primary'
    ? { ...d365Btn('primary'), fontFamily: "'Segoe UI','Inter',system-ui,sans-serif",
        padding: pad[size], fontSize: fs[size] }
    : { ...d365Btn('secondary'), border: `2px solid ${T.primary}`, color: T.primary,
        fontFamily: "'Segoe UI','Inter',system-ui,sans-serif",
        padding: pad[size], fontSize: fs[size] };

  const tableMap: Record<string, string> = {
    req: 'requisitions', po: 'purchase_orders', grn: 'goods_received',
  };
  const statusMap: Record<string, string[]> = {
    req: ['approved'], po: ['approved','issued'], grn: ['received','completed'],
  };
  const numCol: Record<string, string> = {
    req: 'requisition_number', po: 'po_number', grn: 'grn_number',
  };

  const load = async (t: 'req'|'po'|'grn') => {
    setLoading(true); setDocs([]); setError(null);
    try {
      const { data, error: qErr } = await db.from(tableMap[t])
        .select('id,status,created_at,created_by,' + numCol[t] + ',stamped,stamped_by_name')
        .in('status', statusMap[t])
        .order('created_at', { ascending: false })
        .limit(30);
      if (qErr) throw qErr;
      setDocs(data || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load documents');
    }
    setLoading(false);
  };

  const openModal = async () => {
    setOpen(true);
    await load('req');
  };

  const switchTab = async (t: 'req'|'po'|'grn') => {
    setTab(t);
    await load(t);
  };

  const moduleMap: Record<string, string> = { req: 'procurement', po: 'procurement', grn: 'inventory' };
  const labelMap:  Record<string, string> = { req: 'Requisition', po: 'Purchase Order', grn: 'Goods Received Note' };

  const applyStamp = async (doc: any) => {
    const { id, status: docStatus } = doc;
    setStamping(id);
    setError(null);
    const now    = new Date().toISOString();
    const stamper = profile?.full_name || 'Admin';
    try {
      const { error: updErr } = await db.from(tableMap[tab]).update({
        stamped: true, stamped_by_name: stamper,
        stamped_at: now, stamp_label: docStatus.toUpperCase(),
      }).eq('id', id);
      if (updErr) throw updErr;

      // Audit logging is best-effort only — it must never block the stamp
      // from showing as applied, since a schema mismatch here previously
      // caused the whole action to silently appear to do nothing.
      try {
        await db.from('audit_log').insert({
          user_id: user?.id ?? null,
          action: 'STAMP_APPLIED',
          entity_type: tableMap[tab],
          entity_id: id,
          details: { stamp: docStatus.toUpperCase(), stamped_by: stamper },
        });
      } catch { /* non-critical */ }

      // Notify the document's owner that it's been officially stamped —
      // applying a stamp doesn't touch `status`, so none of the existing
      // status-change notification triggers (triggerRequisitionEvent etc.)
      // would otherwise fire for this action.
      if (doc.created_by && doc.created_by !== user?.id) {
        const docNum = doc[numCol[tab]] || id.slice(0, 8);
        try {
          await sendNotification({
            userId: doc.created_by,
            title: `${labelMap[tab]} Stamped`,
            message: `${docNum} has been officially stamped "${docStatus.toUpperCase()}" by ${stamper}.`,
            type: 'success',
            module: moduleMap[tab],
            senderId: user?.id,
          });
        } catch { /* non-critical — the stamp itself already succeeded */ }
      }

      await load(tab);
      const docNum = doc[numCol[tab]] || id.slice(0, 8);
      setConfirm({
        title: 'Document has been stamped.',
        message: `${labelMap[tab]} ${docNum} was officially stamped "${docStatus.toUpperCase()}" by ${stamper}.`,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not apply stamp');
    }
    setStamping(null);
  };

  const TABS = [
    { id:'req', label:'Requisitions' },
    { id:'po',  label:'Purchase Orders' },
    { id:'grn', label:'GRNs' },
  ] as const;

  const overlayStyle: React.CSSProperties = {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
    zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:"'Segoe UI','Inter',system-ui,sans-serif",
  };
  const modalStyle: React.CSSProperties = {
    background: T.card, borderRadius: T.rXl, width:'min(780px,95vw)',
    maxHeight:'85vh', display:'flex', flexDirection:'column',
    boxShadow: T.shadowLg,
  };

  return (
    <>
      <button style={btnStyle} onClick={openModal}>
        {/* stamp icon inline */}
        <svg width={fs[size]+2} height={fs[size]+2} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1a4 4 0 014 4 4 4 0 01-1.07 2.72L14 9H6l1.07-1.28A4 4 0 016 5a4 4 0 014-4zM4 10h12v2H4v-2zM3 13h14v2H3v-2z"/>
        </svg>
        {label}
      </button>

      {open && (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={modalStyle}>

            {/* header */}
            <div style={{ padding:'20px 24px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius: T.r, background: T.success,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width={18} height={18} viewBox="0 0 20 20" fill="white">
                      <path d="M10 1a4 4 0 014 4 4 4 0 01-1.07 2.72L14 9H6l1.07-1.28A4 4 0 016 5a4 4 0 014-4zM4 10h12v2H4v-2zM3 13h14v2H3v-2z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color: T.fg }}>Official Stamp</div>
                    <div style={{ fontSize:11, color: T.fgMuted }}>Affix approval stamp to procurement documents</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background:'none', border:'none',
                  cursor:'pointer', color: T.fgMuted, fontSize:22, lineHeight:1 }}>✕</button>
              </div>

              <div style={{ display:'flex', gap:0 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => switchTab(t.id)}
                    style={{ padding:'10px 20px', background:'none', border:'none',
                      borderBottom:`2.5px solid ${tab===t.id?T.primary:'transparent'}`,
                      color: tab===t.id?T.primary:T.fgMuted,
                      fontWeight: tab===t.id?800:600, fontSize:13, cursor:'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* body */}
            <div style={{ overflowY:'auto', padding:20, flex:1 }}>
              {error && (
                <div style={{ background: T.errorBg, color: T.error, borderRadius: T.rMd, padding:'10px 14px',
                  fontSize:12, fontWeight:600, marginBottom:14 }}>
                  {error}
                </div>
              )}
              {loading ? (
                <div style={{ textAlign:'center', padding:'40px 0', color: T.fgDim }}>Loading…</div>
              ) : docs.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color: T.fgDim }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>No documents awaiting stamp</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
                  {docs.map(doc => {
                    const num   = doc[numCol[tab]] || doc.id.slice(0,8);
                    const alreadyStamped = !!doc.stamped;
                    return (
                      <div key={doc.id} style={{ border:`1.5px solid ${alreadyStamped?T.success:T.border}`,
                        borderRadius: T.rLg, padding:16, background: alreadyStamped?T.successBg:T.card,
                        display:'flex', alignItems:'center', gap:14 }}>

                        <div style={{ flexShrink:0 }}>
                          <DocumentStamp status={doc.status} date={doc.created_at}
                            size={80} rotate={-12} worn approvedBy={doc.stamped_by_name} />
                        </div>

                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:800, color: T.fg,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {num}
                          </div>
                          <div style={{ fontSize:11, color: T.fgMuted, marginTop:2 }}>
                            {new Date(doc.created_at).toLocaleDateString('en-KE',
                              {day:'2-digit', month:'short', year:'numeric'})}
                          </div>
                          <div style={{ marginTop:4 }}>
                            <span style={statusBadge(doc.status)}>{doc.status}</span>
                          </div>
                          {alreadyStamped && doc.stamped_by_name && (
                            <div style={{ fontSize:10, color: T.success, marginTop:3 }}>
                              ✓ Stamped by {doc.stamped_by_name}
                            </div>
                          )}
                        </div>

                        <button
                          disabled={!!stamping || alreadyStamped}
                          onClick={() => applyStamp(doc)}
                          style={{ padding:'7px 14px', borderRadius: T.r, border:'none',
                            background: alreadyStamped?T.successBg:T.success,
                            color: alreadyStamped?T.success:'#fff',
                            fontWeight:700, fontSize:11, cursor: alreadyStamped?'default':'pointer',
                            flexShrink:0, opacity: stamping===doc.id?0.6:1 }}>
                          {stamping===doc.id ? '…' : alreadyStamped ? '✓ Done' : 'Stamp'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <BrandConfirmation
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message}
        status="success"
        autoDismissMs={3500}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
