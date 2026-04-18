/**
 * ProcurBosse IT Admin — Full Control Dashboard
 * React + TypeScript desktop app (Electron shell)
 * Live stats: Supabase · Tencent EdgeOne · GitHub · System
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Supabase client ────────────────────────────────────────────────
const SB_URL = 'https://yvjfehnzbzjliizjvuhq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc';
const sb = createClient(SB_URL, SB_KEY);

const GH_REPO  = 'huiejorjdsksfn/medi-procure-hub';
const WEB_URL  = 'https://procurbosse.edgeone.app';
const TENCENT_DOMAIN = 'procurbosse.edgeone.app';

// ── Types ───────────────────────────────────────────────────────────
interface Stats {
  onlineUsers: number; pendingReqs: number; pendingPOs: number;
  lowStock: number; pendingVouchers: number; totalSuppliers: number;
  dbLatency: number; siteUp: boolean; siteLatency: number;
  lastDeploy: string; ghLastCommit: string; ghBranch: string;
  totalUsers: number; todayAudit: number; smsToday: number;
}
interface User { id: string; email: string; full_name: string; role: string; last_sign_in: string; }
interface AuditEntry { id: string; action: string; entity_type: string; description: string; created_at: string; user_id: string; }
interface Deploy { sha: string; message: string; date: string; author: string; status: string; }

// ── Theme tokens ────────────────────────────────────────────────────
const T = {
  bg:      '#0f0f1a', card:   '#1a1a2e', card2:  '#16213e',
  border:  '#1e2a45', border2:'#253352',
  primary: '#0078d4', success:'#16a34a', warning:'#d97706',
  error:   '#dc2626', info:   '#0891b2', purple: '#7c3aed',
  fg:      '#e2e8f0', fgDim:  '#94a3b8', fgMuted:'#64748b',
  red:     '#b91c1c',
};

const card: React.CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: 16,
};

// ── Stat tile ───────────────────────────────────────────────────────
function StatTile({ label, value, color, sub }: { label: string; value: string|number; color: string; sub?: string }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: T.fgDim, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.fgMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const m: Record<string,[string,string]> = {
    active:    [T.success, '#dcfce7'], online:   [T.success, '#dcfce7'],
    pending:   [T.warning, '#fef3c7'], warning:  [T.warning, '#fef3c7'],
    error:     [T.error,   '#fee2e2'], offline:  [T.error,   '#fee2e2'],
    success:   [T.success, '#dcfce7'], deployed: [T.info,    '#cffafe'],
    draft:     [T.fgDim,   '#f1f5f9'],
  };
  const [fg, bg] = m[status?.toLowerCase()] || [T.fgDim, '#f1f5f9'];
  return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: fg, background: bg }}>{status}</span>;
}

// ── Section header ──────────────────────────────────────────────────
function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 800, color: T.fg, letterSpacing: '0.04em' }}>{title}</h3>
      {action}
    </div>
  );
}

function Btn({ label, color = T.primary, onClick, small }: { label: string; color?: string; onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: color, color: '#fff', border: 'none',
      padding: small ? '4px 10px' : '7px 14px',
      borderRadius: 6, fontSize: small ? 11 : 12,
      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  );
}

// ── MAIN APP ────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<'overview'|'users'|'audit'|'deploy'|'database'|'settings'>('overview');
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [sysInfo, setSysInfo] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [broadcast, setBroadcast] = useState('');
  const [sqlQuery, setSqlQuery] = useState('SELECT COUNT(*) FROM requisitions;');
  const [sqlResult, setSqlResult] = useState('');
  const [sqlRunning, setSqlRunning] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:'ok'|'err'}|null>(null);
  const timerRef = useRef<any>(null);

  const notify = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load system info from Electron ────────────────────────────────
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.getSystemInfo) {
      api.getSystemInfo().then((info: Record<string,string>) => setSysInfo(info));
    }
  }, []);

  // ── Fetch all stats ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [r, po, ls, pv, sup, usr, aud, sms] = await Promise.allSettled([
        sb.from('requisitions').select('id',{count:'exact',head:true}).in('status',['submitted','pending']),
        sb.from('purchase_orders').select('id',{count:'exact',head:true}).eq('status','pending'),
        sb.from('items').select('id',{count:'exact',head:true}).lt('current_quantity',5),
        sb.from('payment_vouchers').select('id',{count:'exact',head:true}).in('status',['pending','submitted']),
        sb.from('suppliers').select('id',{count:'exact',head:true}).eq('status','active'),
        sb.from('profiles').select('id',{count:'exact',head:true}),
        sb.from('audit_log').select('id',{count:'exact',head:true}).gte('created_at', new Date(Date.now()-86400000).toISOString()),
        sb.from('sms_log').select('id',{count:'exact',head:true}).gte('sent_at', new Date(Date.now()-86400000).toISOString()),
      ]);
      const v = (x: any) => x.status==='fulfilled' ? x.value?.count ?? 0 : 0;

      // Ping the live site
      const t0 = Date.now();
      let siteUp = false, siteLatency = 0;
      try {
        const res = await fetch(WEB_URL, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        siteUp = res.ok; siteLatency = Date.now() - t0;
      } catch { siteUp = false; }

      // DB latency
      const dt0 = Date.now();
      await sb.from('system_settings').select('key').limit(1);
      const dbLatency = Date.now() - dt0;

      // GitHub last commit
      let ghLastCommit = '', ghBranch = 'main', lastDeploy = '';
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${GH_REPO}/commits/main`);
        if (ghRes.ok) {
          const gh = await ghRes.json();
          ghLastCommit = gh.commit?.message?.split('\n')[0]?.slice(0,60) || '';
          lastDeploy = gh.commit?.author?.date || '';
        }
      } catch {}

      setStats({
        pendingReqs: v(r), pendingPOs: v(po), lowStock: v(ls),
        pendingVouchers: v(pv), totalSuppliers: v(sup),
        totalUsers: v(usr), todayAudit: v(aud), smsToday: v(sms),
        dbLatency, siteUp, siteLatency, ghLastCommit, ghBranch, lastDeploy,
        onlineUsers: 0,
      });
      setLastUpdate(new Date().toLocaleTimeString('en-KE'));

      // Update tray
      const api = (window as any).electronAPI;
      if (api?.sendTrayStats) {
        api.sendTrayStats({ online: 0, reqs: v(r), pos: v(po), cpu: sysInfo.cpus+'c', ram: sysInfo.freeRam });
      }
    } catch (e) { console.error('fetchStats error:', e); }
    setLoading(false);
  }, [sysInfo]);

  // ── Auto-refresh every 30s ─────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    timerRef.current = setInterval(fetchStats, 30000);
    return () => clearInterval(timerRef.current);
  }, [fetchStats]);

  // ── Listen for Electron events ─────────────────────────────────────
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;
    api.onRefreshStats?.(() => fetchStats());
    api.onPowerEvent?.((e: string) => { if (e === 'resume') setTimeout(fetchStats, 2000); });
    return () => { api.removeAllListeners?.('refresh-stats'); api.removeAllListeners?.('power-event'); };
  }, [fetchStats]);

  // ── Load users ─────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    const { data: profiles } = await sb.from('profiles').select('*').order('full_name').limit(100);
    const { data: roles }    = await sb.from('user_roles').select('user_id,role');
    const roleMap: Record<string,string> = {};
    (roles||[]).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    const merged = (profiles||[]).map((p: any) => ({ ...p, role: roleMap[p.id] || 'none' }));
    setUsers(merged);
  }, []);

  // ── Load audit log ─────────────────────────────────────────────────
  const loadAudit = useCallback(async () => {
    const { data } = await sb.from('audit_log').select('*').order('created_at',{ascending:false}).limit(50);
    setAudit(data || []);
  }, []);

  // ── Load GitHub deploys ────────────────────────────────────────────
  const loadDeploys = useCallback(async () => {
    try {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/commits?per_page=10`);
      if (!res.ok) return;
      const commits = await res.json();
      setDeploys(commits.map((c: any) => ({
        sha:     c.sha?.slice(0,7),
        message: c.commit?.message?.split('\n')[0]?.slice(0,70),
        date:    new Date(c.commit?.author?.date).toLocaleString('en-KE'),
        author:  c.commit?.author?.name,
        status:  'deployed',
      })));
    } catch {}
  }, []);

  useEffect(() => {
    if (tab === 'users')   loadUsers();
    if (tab === 'audit')   loadAudit();
    if (tab === 'deploy')  loadDeploys();
  }, [tab, loadUsers, loadAudit, loadDeploys]);

  // ── Actions ────────────────────────────────────────────────────────
  const sendBroadcast = async () => {
    if (!broadcast.trim()) return;
    await (sb as any).from('system_broadcast').insert({ message: broadcast, created_at: new Date().toISOString(), active: true });
    notify('Broadcast sent to all users');
    setBroadcast('');
  };

  const triggerDeploy = async () => {
    if (!confirm('Trigger GitHub Actions deploy workflow now?')) return;
    try {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/actions/workflows/web-build-deploy.yml/dispatches`, {
        method: 'POST',
        headers: { 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main' }),
      });
      notify(res.ok ? 'Deploy triggered!' : 'Need GitHub PAT in settings', res.ok ? 'ok' : 'err');
    } catch { notify('Deploy trigger failed', 'err'); }
  };

  const runSQL = async () => {
    if (!sqlQuery.trim()) return;
    setSqlRunning(true); setSqlResult('Running...');
    try {
      const { data, error } = await (sb as any).rpc('exec_sql', { sql: sqlQuery });
      if (error) setSqlResult('Error: ' + error.message);
      else setSqlResult(JSON.stringify(data, null, 2));
    } catch (e: any) { setSqlResult('Error: ' + e.message); }
    setSqlRunning(false);
  };

  const suspendUser = async (userId: string) => {
    await (sb as any).from('profiles').update({ suspended: true }).eq('id', userId);
    notify('User suspended'); loadUsers();
  };

  const resetPassword = async (email: string) => {
    await sb.auth.resetPasswordForEmail(email, { redirectTo: `${WEB_URL}/reset-password` });
    notify('Password reset email sent');
  };

  // ── Tab button ─────────────────────────────────────────────────────
  const Tab = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)} style={{
      padding: '8px 16px', border: 'none', borderRadius: 6,
      background: tab === id ? T.primary : 'transparent',
      color: tab === id ? '#fff' : T.fgDim,
      fontWeight: tab === id ? 800 : 500, fontSize: 12,
      cursor: 'pointer', fontFamily: 'inherit',
      borderBottom: tab === id ? `2px solid ${T.primary}` : '2px solid transparent',
    }}>{label}</button>
  );

  // ── RENDER ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Segoe UI',system-ui,sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, background: toast.type==='ok' ? T.success : T.error, color: '#fff', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.type==='ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: T.card2, borderBottom: `1px solid ${T.border}`, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 52, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏥</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: T.fg }}>ProcurBosse IT Admin</div>
            <div style={{ fontSize: 9, color: T.fgMuted, letterSpacing: '0.08em' }}>EL5 MEDIPROCURE · EMBU COUNTY</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 20 }}>
          <Tab id="overview"  label="📊 Overview" />
          <Tab id="users"     label="👥 Users" />
          <Tab id="audit"     label="📋 Audit" />
          <Tab id="deploy"    label="🚀 Deploy" />
          <Tab id="database"  label="🗄️ Database" />
          <Tab id="settings"  label="⚙️ Settings" />
        </div>

        {/* Status indicators */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: stats.siteUp ? T.success : T.error }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: stats.siteUp ? T.success : T.error, animation: stats.siteUp ? 'pulse 2s infinite' : 'none' }}/>
            {stats.siteUp ? `Site ${stats.siteLatency}ms` : 'Site Down'}
          </div>
          <div style={{ fontSize: 11, color: T.fgMuted }}>
            DB: <span style={{ color: (stats.dbLatency ?? 999) < 300 ? T.success : T.warning }}>{stats.dbLatency}ms</span>
          </div>
          <div style={{ fontSize: 10, color: T.fgMuted }}>Updated: {lastUpdate}</div>
          <Btn label="🔄" onClick={fetchStats} small color={T.card} />
          <Btn label="🌐 Open Site" onClick={() => (window as any).electronAPI?.openExternal(WEB_URL)} small />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div>
            {/* KPI row 1 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' as const }}>
              <StatTile label="Pending Reqs"     value={loading?'…':stats.pendingReqs??0}     color={T.warning} />
              <StatTile label="Pending POs"      value={loading?'…':stats.pendingPOs??0}      color={T.primary} />
              <StatTile label="Pending Vouchers" value={loading?'…':stats.pendingVouchers??0} color={T.purple} />
              <StatTile label="Low Stock Items"  value={loading?'…':stats.lowStock??0}        color={T.error} />
              <StatTile label="Active Suppliers" value={loading?'…':stats.totalSuppliers??0}  color={T.success} />
              <StatTile label="Total Users"      value={loading?'…':stats.totalUsers??0}      color={T.info} />
              <StatTile label="Audit (24h)"      value={loading?'…':stats.todayAudit??0}      color={T.fgDim} />
              <StatTile label="SMS (24h)"        value={loading?'…':stats.smsToday??0}        color={T.success} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* System info */}
              <div style={card}>
                <SectionHead title="🖥️ System Info"/>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  {[
                    ['Hostname',    sysInfo.hostname],
                    ['Platform',    sysInfo.platform],
                    ['CPUs',        sysInfo.cpus],
                    ['Total RAM',   sysInfo.totalRam],
                    ['Free RAM',    sysInfo.freeRam],
                    ['Uptime',      sysInfo.uptime],
                    ['Electron',    sysInfo.electronVer],
                    ['Node.js',     sysInfo.nodeVer],
                    ['App Version', sysInfo.appVer],
                  ].map(([k,v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '5px 8px', color: T.fgDim, fontWeight: 600 }}>{k}</td>
                      <td style={{ padding: '5px 8px', color: T.fg, fontFamily: 'monospace', fontSize: 11 }}>{v || '–'}</td>
                    </tr>
                  ))}
                </table>
              </div>

              {/* GitHub / deploy status */}
              <div style={card}>
                <SectionHead title="🚀 Deployment Status" action={<Btn label="Trigger Deploy" onClick={triggerDeploy} small />}/>
                <div style={{ fontSize: 12, color: T.fgDim, marginBottom: 8 }}>Last commit:</div>
                <div style={{ fontSize: 12, color: T.fg, background: T.bg, padding: '8px 10px', borderRadius: 6, fontFamily: 'monospace', marginBottom: 12 }}>
                  {stats.ghLastCommit || 'Loading...'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'Site',     status: stats.siteUp ? 'online' : 'offline' },
                    { label: 'Database', status: (stats.dbLatency??999)<500 ? 'active' : 'warning' },
                    { label: 'Deploy',   status: 'deployed' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: 'center' as const, padding: '8px 4px', background: T.bg, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: T.fgDim, marginBottom: 4 }}>{s.label}</div>
                      <Badge status={s.status}/>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: T.fgMuted }}>
                  Repo: <a href="#" onClick={() => (window as any).electronAPI?.openExternal(`https://github.com/${GH_REPO}`)} style={{ color: T.primary }}>github.com/{GH_REPO}</a>
                </div>
              </div>

              {/* Broadcast */}
              <div style={card}>
                <SectionHead title="📢 System Broadcast"/>
                <textarea
                  value={broadcast}
                  onChange={e => setBroadcast(e.target.value)}
                  placeholder="Type a message to broadcast to all logged-in users..."
                  rows={3}
                  style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: T.fg, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Btn label="📢 Send to All Users" onClick={sendBroadcast} color={T.warning}/>
                  <Btn label="Clear" onClick={() => setBroadcast('')} small color={T.card2}/>
                </div>
              </div>

              {/* Quick links */}
              <div style={card}>
                <SectionHead title="🔗 Quick Links"/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: '🌐 Live Site',      url: WEB_URL },
                    { label: '🗄️ Supabase',       url: 'https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq' },
                    { label: '⚙️ GitHub Actions', url: `https://github.com/${GH_REPO}/actions` },
                    { label: '📦 Releases',        url: `https://github.com/${GH_REPO}/releases` },
                    { label: '🌩️ Tencent EdgeOne', url: 'https://console.tencentcloud.com/edgeone' },
                    { label: '📊 DB Monitor',      url: `${WEB_URL}/admin/db-test` },
                    { label: '👥 Users',           url: `${WEB_URL}/users` },
                    { label: '🔒 IP Access',       url: `${WEB_URL}/admin/ip-access` },
                  ].map(l => (
                    <button key={l.label} onClick={() => (window as any).electronAPI?.openExternal(l.url)}
                      style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 11, color: T.fg, cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit' }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ─────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div style={card}>
            <SectionHead title={`👥 All Users (${users.length})`} action={<Btn label="🔄 Refresh" onClick={loadUsers} small/>}/>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {['Name','Email','Role','Last Sign-in','Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left' as const, color: T.fgDim, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '8px 10px', color: T.fg, fontWeight: 600 }}>{u.full_name || '–'}</td>
                    <td style={{ padding: '8px 10px', color: T.fgDim, fontFamily: 'monospace', fontSize: 11 }}>{u.email}</td>
                    <td style={{ padding: '8px 10px' }}><Badge status={u.role || 'none'}/></td>
                    <td style={{ padding: '8px 10px', color: T.fgMuted, fontSize: 11 }}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleString('en-KE') : '–'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <Btn label="Reset PW" onClick={() => resetPassword(u.email)} small color={T.warning}/>
                        <Btn label="Suspend"  onClick={() => suspendUser(u.id)}      small color={T.error}/>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' as const, color: T.fgMuted }}>Loading users...</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── AUDIT TAB ─────────────────────────────────────────────── */}
        {tab === 'audit' && (
          <div style={card}>
            <SectionHead title="📋 Audit Log (Last 50 entries)" action={<Btn label="🔄 Refresh" onClick={loadAudit} small/>}/>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {['Time','Action','Entity','Description'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left' as const, color: T.fgDim, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '6px 10px', color: T.fgMuted, fontSize: 10, whiteSpace: 'nowrap' as const }}>{new Date(a.created_at).toLocaleString('en-KE')}</td>
                    <td style={{ padding: '6px 10px' }}><Badge status={a.action}/></td>
                    <td style={{ padding: '6px 10px', color: T.fgDim, fontSize: 11 }}>{a.entity_type}</td>
                    <td style={{ padding: '6px 10px', color: T.fg, fontSize: 11, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.description}</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' as const, color: T.fgMuted }}>Loading audit log...</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DEPLOY TAB ────────────────────────────────────────────── */}
        {tab === 'deploy' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Btn label="🚀 Trigger Web Deploy" onClick={triggerDeploy} color={T.primary}/>
              <Btn label="🔄 Refresh Commits" onClick={loadDeploys} color={T.card2}/>
              <Btn label="🌐 View Actions" onClick={() => (window as any).electronAPI?.openExternal(`https://github.com/${GH_REPO}/actions`)}/>
              <Btn label="📦 View Releases" onClick={() => (window as any).electronAPI?.openExternal(`https://github.com/${GH_REPO}/releases`)} color={T.success}/>
            </div>
            <div style={card}>
              <SectionHead title="📜 Recent Commits (main branch)"/>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {['SHA','Message','Author','Date','Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left' as const, color: T.fgDim, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deploys.map(d => (
                    <tr key={d.sha} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11, color: T.primary }}>{d.sha}</td>
                      <td style={{ padding: '7px 10px', color: T.fg, maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.message}</td>
                      <td style={{ padding: '7px 10px', color: T.fgDim, fontSize: 11 }}>{d.author}</td>
                      <td style={{ padding: '7px 10px', color: T.fgMuted, fontSize: 11, whiteSpace: 'nowrap' as const }}>{d.date}</td>
                      <td style={{ padding: '7px 10px' }}><Badge status={d.status}/></td>
                    </tr>
                  ))}
                  {deploys.length === 0 && <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' as const, color: T.fgMuted }}>Loading commits...</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DATABASE TAB ──────────────────────────────────────────── */}
        {tab === 'database' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={card}>
              <SectionHead title="🗄️ SQL Query Runner"/>
              <div style={{ fontSize: 11, color: T.warning, marginBottom: 8 }}>⚠️ Read-only recommended. Requires exec_sql RPC in Supabase.</div>
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                rows={5}
                style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: '#a8ff78', fontSize: 12, fontFamily: 'monospace', resize: 'vertical' as const, outline: 'none' }}
              />
              <div style={{ marginTop: 8 }}>
                <Btn label={sqlRunning ? 'Running…' : '▶ Run Query'} onClick={runSQL} color={sqlRunning ? T.fgMuted : T.primary}/>
              </div>
              {sqlResult && (
                <pre style={{ marginTop: 10, background: T.bg, padding: 10, borderRadius: 6, fontSize: 11, color: T.fg, overflow: 'auto', maxHeight: 200 }}>
                  {sqlResult}
                </pre>
              )}
            </div>

            <div style={card}>
              <SectionHead title="📊 Quick Queries"/>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {[
                  ['Count all tables', "SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"],
                  ['Active users today', "SELECT p.email, al.action, al.created_at FROM audit_log al JOIN profiles p ON p.id=al.user_id WHERE al.created_at > now()-interval '24 hours' ORDER BY al.created_at DESC LIMIT 20;"],
                  ['Low stock items',    "SELECT name, current_quantity, reorder_level FROM items WHERE current_quantity <= reorder_level ORDER BY current_quantity ASC;"],
                  ['Pending approvals',  "SELECT 'Requisitions' as type, COUNT(*) FROM requisitions WHERE status IN ('submitted','pending') UNION ALL SELECT 'POs', COUNT(*) FROM purchase_orders WHERE status='pending';"],
                  ['RLS disabled',       "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;"],
                  ['SMS last 24h',       "SELECT to_number, status, channel, sent_at FROM sms_log WHERE sent_at > now()-interval '24 hours' ORDER BY sent_at DESC LIMIT 20;"],
                ].map(([label, sql]) => (
                  <button key={label} onClick={() => setSqlQuery(sql as string)}
                    style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, padding: '7px 10px', fontSize: 11, color: T.fg, cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'monospace' }}>
                    {label as string}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={card}>
              <SectionHead title="⚙️ App Settings"/>
              {[
                { label: 'Supabase URL',         value: SB_URL },
                { label: 'GitHub Repo',          value: GH_REPO },
                { label: 'Live Site URL',        value: WEB_URL },
                { label: 'EdgeOne Domain',       value: TENCENT_DOMAIN },
                { label: 'Auto-start at login',  value: 'Enabled' },
                { label: 'Refresh interval',     value: '30 seconds' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                  <span style={{ color: T.fgDim, fontWeight: 600 }}>{s.label}</span>
                  <span style={{ color: T.fg, fontFamily: 'monospace', fontSize: 11, maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden' }}>{s.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <Btn label="🔄 Restart App" onClick={() => (window as any).electronAPI?.restartApp()} color={T.warning}/>
                <Btn label="📂 Open Logs"   onClick={() => (window as any).electronAPI?.openLogs()} small color={T.card2}/>
              </div>
            </div>
            <div style={card}>
              <SectionHead title="🔗 External Services"/>
              {[
                { label: '🗄️ Supabase Dashboard', url: 'https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq', status: 'active' },
                { label: '🐙 GitHub Repository',   url: `https://github.com/${GH_REPO}`, status: 'active' },
                { label: '⚙️ GitHub Actions',       url: `https://github.com/${GH_REPO}/actions`, status: 'active' },
                { label: '🌩️ Tencent EdgeOne',      url: 'https://console.tencentcloud.com/edgeone', status: 'active' },
                { label: '📦 GitHub Releases',      url: `https://github.com/${GH_REPO}/releases`, status: 'active' },
                { label: '📱 Twilio Console',       url: 'https://console.twilio.com', status: 'active' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
                  <button onClick={() => (window as any).electronAPI?.openExternal(s.url)}
                    style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', textAlign: 'left' as const }}>
                    {s.label}
                  </button>
                  <Badge status={s.status}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ background: T.card2, borderTop: `1px solid ${T.border}`, padding: '5px 20px', display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: T.fgMuted }}>
        <span>ProcurBosse IT Admin v1.0</span>
        <span>·</span>
        <span>EL5 MediProcure · Embu Level 5 Hospital</span>
        <span>·</span>
        <span style={{ color: stats.siteUp ? T.success : T.error }}>{stats.siteUp ? '🟢 Site Online' : '🔴 Site Offline'}</span>
        <span>·</span>
        <span>DB: {stats.dbLatency}ms</span>
        <div style={{ marginLeft: 'auto' }}>{new Date().toLocaleString('en-KE')}</div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
