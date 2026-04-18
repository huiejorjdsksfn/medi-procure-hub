/**
 * ProcurBosse v21.0 -- ErrorBoundary Nuclear Edition
 * Decodes React Error #310 + all known minified errors
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 * BUILD-SAFE: zero non-ASCII chars
 */
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError:boolean; error:string; stack:string; errorId:string; errCode:string; retries:number; }

const REACT_ERRS: Record<string,string> = {
  "310": "Hooks called conditionally or in wrong order (React Error #310). A hook (useState/useEffect) was called inside an if-block, loop, or after an early return. Fix: move all hooks to the top of the component before any returns.",
  "321": "setState called on unmounted component. Add cleanup in useEffect return.",
  "185": "Maximum update depth exceeded -- infinite loop in setState or useEffect dependencies.",
  "306": "Rendered fewer hooks than expected. Check for early returns above hook calls.",
  "418": "Hydration mismatch: server and client HTML differ.",
  "301": "Null/undefined accessed before render. Add null checks.",
};

function decode(msg: string): string {
  const m = msg.match(/Minified React error #(\d+)/);
  if (m) return REACT_ERRS[m[1]] || `React Error #${m[1]} -- see react.dev/errors/${m[1]}`;
  return msg;
}

function classify(msg: string, stack: string): [string, string, string] {
  if (msg.includes("#310") || msg.includes("Hooks"))
    return ["Hooks Violation", "#d97706", "Move all hooks (useState, useEffect, etc.) to the top of the component. No hooks inside if/else, loops, or after early returns."];
  if (msg.includes("Cannot read") || msg.includes("undefined"))
    return ["Null Reference", "#b91c1c", "A variable was accessed before initialization. Add null checks: value?.property or value && value.property"];
  if (msg.includes("Unterminated") || msg.includes("regular expression"))
    return ["Build/Syntax Error", "#7719aa", "A Unicode character in a source file broke the build. Strip all non-ASCII chars from JSX/TSX files."];
  if (msg.includes("Maximum update"))
    return ["Infinite Loop", "#b91c1c", "Infinite render loop. Check useEffect dependency arrays and avoid setState inside render."];
  if (stack.includes("supabase") || stack.includes("Supabase"))
    return ["Database Error", "#038387", "A Supabase query failed. Check table names, column names, and RLS policies in Supabase dashboard."];
  return ["Runtime Error", "#b91c1c", "Unexpected error. Try refreshing or clearing browser cache (Ctrl+Shift+R)."];
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError:false, error:"", stack:"", errorId:"", errCode:"", retries:0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    const m = error.message?.match(/#(\d+)/);
    return { hasError:true, error:decode(error.message||"Unknown error"), stack:error.stack||"", errorId, errCode:m?m[1]:"" };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[PROCURBOSSE CRASH]", this.state.errorId, error.message);
    try {
      const url = `${(import.meta as any).env?.VITE_SUPABASE_URL}/rest/v1/admin_activity_log`;
      const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      if (url && key) fetch(url, {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":key,"Authorization":`Bearer ${key}`,"Prefer":"return=minimal"},
        body:JSON.stringify({ action:"system", entity_type:"ui_crash", severity:"critical",
          description:`[UI_CRASH] ${error.message?.slice(0,200)}`,
          metadata:{ errorId:this.state.errorId, stack:error.stack?.slice(0,600), component:info.componentStack?.slice(0,400), url:window.location.href } })
      }).catch(()=>{});
    } catch {}
  }

  retry = () => this.setState(s=>({ hasError:false, error:"", stack:"", errorId:"", errCode:"", retries:s.retries+1 }));
  goHome = () => { this.setState({ hasError:false, retries:0 }); window.location.href="/dashboard"; };
  hardReload = () => { sessionStorage.clear(); window.location.reload(); };
  clearAll = () => { try{ localStorage.clear(); sessionStorage.clear(); if("caches"in window)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))); }catch{} window.location.href="/"; };

  render() {
    if (!this.state.hasError) return this.props.children;
    const { error, stack, errorId, errCode } = this.state;
    const [errType, errColor, advice] = classify(error, stack);
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f3f5f8", fontFamily:"'Segoe UI',system-ui,sans-serif", padding:20 }}>
        <div style={{ maxWidth:640, width:"100%", background:"#fff", border:"1px solid #dae0e8", borderRadius:14, overflow:"hidden", boxShadow:"0 12px 40px rgba(0,0,0,.12)" }}>
          {/* Header */}
          <div style={{ background:errColor, padding:"16px 24px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff" }}>!</div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:"#fff" }}>Application Error -- {errType}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:"monospace" }}>ID: {errorId}{errCode?` | React Error #${errCode}`:""}</div>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding:"20px 24px" }}>
            <div style={{ background:errColor+"10", border:`1px solid ${errColor}33`, borderRadius:8, padding:"12px 16px", marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:errColor, marginBottom:6 }}>What happened</div>
              <div style={{ fontSize:13, color:"#333", lineHeight:1.6 }}>{error}</div>
            </div>
            <div style={{ background:"#f0f7ff", border:"1px solid #bde0ff", borderRadius:8, padding:"12px 16px", marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#0078d4", marginBottom:6 }}>How to fix</div>
              <div style={{ fontSize:12, color:"#444", lineHeight:1.6 }}>{advice}</div>
            </div>
            {stack && (
              <details style={{ marginBottom:16 }}>
                <summary style={{ cursor:"pointer", fontSize:12, fontWeight:700, color:"#666", padding:"6px 0" }}>Technical Details (Stack Trace)</summary>
                <div style={{ background:"#1e1e2e", borderRadius:8, padding:14, marginTop:8, maxHeight:160, overflowY:"auto" }}>
                  <pre style={{ margin:0, fontFamily:"monospace", fontSize:10, color:"#ccc", whiteSpace:"pre-wrap" as const, wordBreak:"break-all" as const }}>{stack.slice(0,2000)}</pre>
                </div>
              </details>
            )}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" as const }}>
              <button onClick={this.retry} style={{ flex:1, minWidth:120, padding:"10px 16px", background:errColor, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Retry</button>
              <button onClick={this.goHome} style={{ flex:1, minWidth:120, padding:"10px 16px", background:"#0078d4", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Go to Dashboard</button>
              <button onClick={this.hardReload} style={{ flex:1, minWidth:120, padding:"10px 16px", background:"#fff", color:"#666", border:"1px solid #dde1e7", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Hard Reload</button>
            </div>
            <div style={{ marginTop:12, textAlign:"center" as const }}>
              <button onClick={this.clearAll} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#aaa", fontFamily:"inherit", textDecoration:"underline" }}>Clear cache and reload (fixes most persistent errors)</button>
            </div>
          </div>
          <div style={{ background:"#f8f9fb", borderTop:"1px solid #eee", padding:"10px 24px", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, color:"#aaa" }}>EL5 MediProcure ProcurBosse v21.0</span>
            <span style={{ fontSize:11, color:"#aaa", fontFamily:"monospace" }}>{new Date().toLocaleString("en-KE")}</span>
          </div>
        </div>
      </div>
    );
  }
}
