/**
 * EL5 MediProcure — DocumentStamp v3.0
 * Realistic circular rubber stamp with ink-distress SVG filter,
 * curved top/bottom text, day/month/year date block, and optional
 * worn-ink texture. Used across all procurement documents.
 */

export type StampStatus =
  | 'approved' | 'rejected' | 'pending' | 'submitted' | 'received'
  | 'issued'   | 'draft'    | 'ordered' | 'partial'   | 'sent'
  | 'cancelled'| 'published'| 'closed'  | 'awarded'   | 'active'
  | 'expired'  | 'verified' | 'official' | 'confidential' | 'urgent';

interface StampCfg {
  ink:      string;   // main ink colour
  label:    string;   // big centre word
  topArc:   string;   // text curved along top ring
  botArc:   string;   // text curved along bottom ring
  star?:    boolean;  // show ★ decorators
}

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
}

export function DocumentStamp({
  status,
  size    = 140,
  date,
  rotate  = -15,
  opacity = 1,
  worn    = true,
  approvedBy,
}: DocumentStampProps) {
  const cfg = CFG[status.toLowerCase()] ?? {
    ink: '#3d3d3d', label: status.toUpperCase(),
    topArc: 'EMBU LEVEL 5 HOSPITAL', botArc: 'OFFICIAL', star: false,
  };
  const { ink, label, topArc, botArc, star } = cfg;

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

          {/* ── Outer double ring ── */}
          <circle cx={cx} cy={cy} r={rOut}  fill="none" stroke={ink} strokeWidth={size * 0.026} />
          <circle cx={cx} cy={cy} r={rOut - size * 0.038} fill="none" stroke={ink} strokeWidth={size * 0.012} />

          {/* ── Inner ring ── */}
          <circle cx={cx} cy={cy} r={rIn2}  fill="none" stroke={ink} strokeWidth={size * 0.012} />

          {/* ── Top arc text ── */}
          <ArcText text={topArc} cx={cx} cy={cy} r={rMid}
            startDeg={topStart} endDeg={topEnd}
            fontSize={fs} ink={ink} bold />

          {/* ── Bottom arc text ── */}
          <ArcText text={botArc} cx={cx} cy={cy} r={rMid}
            startDeg={botStart} endDeg={botEnd} flip
            fontSize={fs} ink={ink} bold />

          {/* ── Stars at sides ── */}
          {star && (
            <>
              {[-1, 1].map(side => {
                const sx = cx + side * (rMid);
                return (
                  <text key={side} x={sx} y={cy} textAnchor="middle"
                    dominantBaseline="middle" fill={ink}
                    fontSize={fs * 1.1} fontWeight="900"
                    fontFamily="Arial, sans-serif">★</text>
                );
              })}
            </>
          )}

          {/* ── Main label ── */}
          <text x={cx} y={cy - size * 0.13}
            textAnchor="middle" dominantBaseline="middle"
            fill={ink} fontSize={fsLabel} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif"
            letterSpacing={size * 0.004}>
            {label}
          </text>

          {/* ── Divider lines ── */}
          <line x1={cx - rIn2 * 0.72} y1={cy - size * 0.028}
                x2={cx + rIn2 * 0.72} y2={cy - size * 0.028}
                stroke={ink} strokeWidth={lineW} />
          <line x1={cx - rIn2 * 0.72} y1={cy + size * 0.13}
                x2={cx + rIn2 * 0.72} y2={cy + size * 0.13}
                stroke={ink} strokeWidth={lineW} />

          {/* ── Date block: DAY  |  MON  |  YEAR ── */}
          {/* vertical separators */}
          <line x1={cx - size * 0.055} y1={cy - size * 0.025}
                x2={cx - size * 0.055} y2={cy + size * 0.125}
                stroke={ink} strokeWidth={lineW * 0.8} />
          <line x1={cx + size * 0.055} y1={cy - size * 0.025}
                x2={cx + size * 0.055} y2={cy + size * 0.125}
                stroke={ink} strokeWidth={lineW * 0.8} />

          {/* DAY */}
          <text x={cx - size * 0.165} y={cy + size * 0.052}
            textAnchor="middle" dominantBaseline="middle"
            fill={ink} fontSize={fsDate} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif">
            {DAY}
          </text>

          {/* MON */}
          <text x={cx} y={cy + size * 0.052}
            textAnchor="middle" dominantBaseline="middle"
            fill={ink} fontSize={fsMon} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif">
            {MON}
          </text>

          {/* YEAR */}
          <text x={cx + size * 0.165} y={cy + size * 0.052}
            textAnchor="middle" dominantBaseline="middle"
            fill={ink} fontSize={fsDate * 0.82} fontWeight="900"
            fontFamily="'Arial Black',Arial,sans-serif">
            {YEAR}
          </text>

          {/* ── Approved-by (small, below date) ── */}
          {approvedBy && (
            <text x={cx} y={cy + size * 0.185}
              textAnchor="middle" dominantBaseline="middle"
              fill={ink} fontSize={size * 0.058} fontWeight="700"
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

  const pad: Record<string, string> = {
    sm:  '5px 12px', md: '8px 18px', lg: '10px 24px',
  };
  const fs: Record<string, number> = { sm: 11, md: 13, lg: 14 };

  const btnStyle: React.CSSProperties = variant === 'primary'
    ? { background:'#0d4f1c', color:'#fff', border:'none',
        borderRadius:6, cursor:'pointer', fontWeight:700,
        fontFamily:"'Segoe UI',Arial,sans-serif", display:'inline-flex',
        alignItems:'center', gap:6, padding:pad[size], fontSize:fs[size] }
    : { background:'transparent', color:'#0d4f1c', border:'2px solid #0d4f1c',
        borderRadius:6, cursor:'pointer', fontWeight:700,
        fontFamily:"'Segoe UI',Arial,sans-serif", display:'inline-flex',
        alignItems:'center', gap:6, padding:pad[size], fontSize:fs[size] };

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
        .select('id,status,created_at,' + numCol[t] + ',stamped,stamped_by_name')
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

  const applyStamp = async (id: string, docStatus: string) => {
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

      await load(tab);
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
    fontFamily:"'Segoe UI',Arial,sans-serif",
  };
  const modalStyle: React.CSSProperties = {
    background:'#fff', borderRadius:14, width:'min(780px,95vw)',
    maxHeight:'85vh', display:'flex', flexDirection:'column',
    boxShadow:'0 24px 80px rgba(0,0,0,0.35)',
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
            <div style={{ padding:'20px 24px 0', borderBottom:'1px solid #e5e7eb' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:8, background:'#0d4f1c',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width={18} height={18} viewBox="0 0 20 20" fill="white">
                      <path d="M10 1a4 4 0 014 4 4 4 0 01-1.07 2.72L14 9H6l1.07-1.28A4 4 0 016 5a4 4 0 014-4zM4 10h12v2H4v-2zM3 13h14v2H3v-2z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:'#111' }}>Official Stamp</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>Affix approval stamp to procurement documents</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background:'none', border:'none',
                  cursor:'pointer', color:'#6b7280', fontSize:22, lineHeight:1 }}>✕</button>
              </div>

              <div style={{ display:'flex', gap:0 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => switchTab(t.id)}
                    style={{ padding:'10px 20px', background:'none', border:'none',
                      borderBottom:`2.5px solid ${tab===t.id?'#0d4f1c':'transparent'}`,
                      color: tab===t.id?'#0d4f1c':'#6b7280',
                      fontWeight: tab===t.id?800:600, fontSize:13, cursor:'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* body */}
            <div style={{ overflowY:'auto', padding:20, flex:1 }}>
              {error && (
                <div style={{ background:'#fee2e2', color:'#991b1b', borderRadius:8, padding:'10px 14px',
                  fontSize:12, fontWeight:600, marginBottom:14 }}>
                  {error}
                </div>
              )}
              {loading ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af' }}>Loading…</div>
              ) : docs.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>No documents awaiting stamp</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
                  {docs.map(doc => {
                    const num   = doc[numCol[tab]] || doc.id.slice(0,8);
                    const alreadyStamped = !!doc.stamped;
                    return (
                      <div key={doc.id} style={{ border:`1.5px solid ${alreadyStamped?'#d1fae5':'#e5e7eb'}`,
                        borderRadius:10, padding:16, background: alreadyStamped?'#f0fdf4':'#fff',
                        display:'flex', alignItems:'center', gap:14 }}>

                        <div style={{ flexShrink:0 }}>
                          <DocumentStamp status={doc.status} date={doc.created_at}
                            size={80} rotate={-12} worn approvedBy={doc.stamped_by_name} />
                        </div>

                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:800, color:'#111',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {num}
                          </div>
                          <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                            {new Date(doc.created_at).toLocaleDateString('en-KE',
                              {day:'2-digit', month:'short', year:'numeric'})}
                          </div>
                          <div style={{ fontSize:11, fontWeight:700, marginTop:4,
                            color: doc.status==='approved'?'#0d4f1c':
                                   doc.status==='rejected'?'#8b0000':'#7a3e00',
                            textTransform:'uppercase' }}>
                            {doc.status}
                          </div>
                          {alreadyStamped && doc.stamped_by_name && (
                            <div style={{ fontSize:10, color:'#059669', marginTop:3 }}>
                              ✓ Stamped by {doc.stamped_by_name}
                            </div>
                          )}
                        </div>

                        <button
                          disabled={!!stamping || alreadyStamped}
                          onClick={() => applyStamp(doc.id, doc.status)}
                          style={{ padding:'7px 14px', borderRadius:6, border:'none',
                            background: alreadyStamped?'#d1fae5':'#0d4f1c',
                            color: alreadyStamped?'#059669':'#fff',
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
    </>
  );
}
