import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Package, Plus, Search, RefreshCw, X, CheckCircle, Clock, AlertTriangle, Eye, Printer } from "lucide-react";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  pending:   {bg:"#fef3c7",color:"#92400e",label:"Pending"},
  inspected: {bg:"#dcfce7",color:"#15803d",label:"Inspected"},
  accepted:  {bg:"#dbeafe",color:"#1d4ed8",label:"Accepted"},
  rejected:  {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
  partial:   {bg:"#f3e8ff",color:"#6d28d9",label:"Partial"},
};

export default function GoodsReceivedPage() {
  const { user, profile, roles } = useAuth();
  const canManage = roles.includes("admin")||roles.includes("procurement_manager")||roles.includes("procurement_officer")||roles.includes("warehouse_officer");
  const [grns,    setGrns]    = useState<any[]>([]);
  const [pos,     setPos]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [selected,setSelected]= useState<any>(null);
  const [form, setForm] = useState({ po_id:"", notes:"", inspection_status:"pending", received_at:new Date().toISOString().slice(0,10) });

  const load = useCallback(async() => {
    setLoading(true);
    const { data } = await (supabase as any).from("goods_received").select("*,purchase_orders(po_number,suppliers(name))").order("created_at",{ascending:false}).limit(100);
    setGrns(data||[]);
    const { data:pd } = await (supabase as any).from("purchase_orders").select("id,po_number,suppliers(name)").in("status",["approved","ordered"]);
    setPos(pd||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const submit = async() => {
    if(!form.po_id) { toast({title:"Select a Purchase Order",variant:"destructive"}); return; }
    const grn_number = `GRN/EL5H/${new Date().getFullYear()}/${Math.floor(100+Math.random()*900)}`;
    const { error } = await (supabase as any).from("goods_received").insert({
      ...form, grn_number, received_by:user?.id,
      created_at:new Date().toISOString(),
    });
    if(error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    await (supabase as any).from("audit_log").insert({user_id:user?.id,user_name:profile?.full_name,action:"GRN_CREATED",module:"inventory",details:JSON.stringify({grn_number})});
    toast({title:"GRN created ✓", description:grn_number});
    setShowNew(false); setForm({po_id:"",notes:"",inspection_status:"pending",received_at:new Date().toISOString().slice(0,10)});
    load();
  };

  const updateStatus = async(id:string, status:string) => {
    await (supabase as any).from("goods_received").update({inspection_status:status}).eq("id",id);
    toast({title:`Status updated to ${status}`}); load();
  };

  const filtered = grns.filter(g => {
    const matchS = !search || [g.grn_number,g.purchase_orders?.po_number,g.purchase_orders?.suppliers?.name,g.notes].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()));
    const matchF = filter==="all" || g.inspection_status===filter;
    return matchS && matchF;
  });

  return (
    <div style={{background:"#f4f6f9",minHeight:"100%",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      {/* Header */}
      <div className="page-hero">
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" as const}}>
          <div style={{width:40,height:40,borderRadius:10,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Package style={{width:18,height:18,color:"#fff"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Goods Received Notes</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>Track and manage all goods receipts and inspections</div>
          </div>
          {canManage && (
            <button onClick={()=>setShowNew(true)} className="btn-primary">
              <Plus style={{width:13,height:13}}/> New GRN
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"10px 16px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" as const}}>
        <div style={{position:"relative",flex:"1 1 200px",maxWidth:320}}>
          <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search GRNs…"
            className="ent-input" style={{paddingLeft:28,paddingRight:10,paddingTop:6,paddingBottom:6}}/>
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="ent-input" style={{width:"auto",paddingTop:6,paddingBottom:6}}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{fontSize:11,color:"#9ca3af"}}>{filtered.length} records</span>
        <button onClick={load} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0}}>
          <RefreshCw style={{width:13,height:13}} className={loading?"animate-spin":""}/>
        </button>
      </div>

      {/* Table */}
      <div style={{padding:"14px 16px"}}>
        <div className="ent-card responsive-table">
          <table style={{width:"100%",borderCollapse:"collapse" as const,minWidth:600}}>
            <thead>
              <tr style={{background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
                {["GRN Number","PO Reference","Supplier","Received Date","Status","Actions"].map(h=>(
                  <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.04em",whiteSpace:"nowrap" as const}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [1,2,3].map(i=>(
                <tr key={i}><td colSpan={6} style={{padding:"10px 12px"}}><div style={{height:10,background:"#f3f4f6",borderRadius:4}} className="animate-pulse"/></td></tr>
              )) : filtered.length===0 ? (
                <tr><td colSpan={6} style={{textAlign:"center" as const,padding:"40px",color:"#9ca3af",fontSize:12}}>No goods received records found</td></tr>
              ) : filtered.map(grn=>{
                const cfg = STATUS_CFG[grn.inspection_status]||STATUS_CFG.pending;
                return (
                  <tr key={grn.id} style={{borderBottom:"1px solid #f9fafb",transition:"background 0.1s"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"10px 12px",fontWeight:700,color:"#111827",fontSize:12}}>{grn.grn_number}</td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#374151"}}>{grn.purchase_orders?.po_number||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#374151"}}>{grn.purchase_orders?.suppliers?.name||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:11,color:"#6b7280"}}>{grn.received_at?new Date(grn.received_at).toLocaleDateString("en-KE"):new Date(grn.created_at).toLocaleDateString("en-KE")}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span className="badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
                        <button onClick={()=>setSelected(grn)} style={{padding:"4px 8px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",fontSize:10,color:"#1d4ed8",fontWeight:600}}>View</button>
                        {canManage && grn.inspection_status==="pending" && (
                          <>
                            <button onClick={()=>updateStatus(grn.id,"accepted")} style={{padding:"4px 8px",background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:5,cursor:"pointer",fontSize:10,color:"#15803d",fontWeight:600}}>Accept</button>
                            <button onClick={()=>updateStatus(grn.id,"rejected")} style={{padding:"4px 8px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer",fontSize:10,color:"#dc2626",fontWeight:600}}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New GRN Modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
              <Package style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>Create Goods Received Note</span>
              <button onClick={()=>setShowNew(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>Purchase Order</label>
                <select value={form.po_id} onChange={e=>setForm(p=>({...p,po_id:e.target.value}))} className="ent-input">
                  <option value="">Select PO…</option>
                  {pos.map(p=><option key={p.id} value={p.id}>{p.po_number} — {p.suppliers?.name}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>Date Received</label>
                  <input type="date" value={form.received_at} onChange={e=>setForm(p=>({...p,received_at:e.target.value}))} className="ent-input"/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>Inspection Status</label>
                  <select value={form.inspection_status} onChange={e=>setForm(p=>({...p,inspection_status:e.target.value}))} className="ent-input">
                    {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>Notes / Remarks</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Inspection notes, discrepancies, condition of goods…" className="ent-input" style={{resize:"vertical" as const}}/>
              </div>
            </div>
            <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
              <button onClick={submit} className="btn-primary" style={{flex:1,justifyContent:"center"}}>
                <Package style={{width:13,height:13}}/> Create GRN
              </button>
              <button onClick={()=>setShowNew(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View GRN Detail */}
      {selected && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>{selected.grn_number}</span>
              <button onClick={()=>setSelected(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
              {[
                ["PO Reference",selected.purchase_orders?.po_number||"—"],
                ["Supplier",    selected.purchase_orders?.suppliers?.name||"—"],
                ["Date Received",selected.received_at?new Date(selected.received_at).toLocaleDateString("en-KE"):new Date(selected.created_at).toLocaleDateString("en-KE")],
                ["Status",      STATUS_CFG[selected.inspection_status]?.label||selected.inspection_status],
                ["Notes",       selected.notes||"No notes"],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",gap:12,fontSize:12}}>
                  <span style={{color:"#9ca3af",fontWeight:600,minWidth:120,flexShrink:0}}>{l}</span>
                  <span style={{color:"#111827"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
              {canManage && selected.inspection_status==="pending" && (
                <>
                  <button onClick={()=>{updateStatus(selected.id,"accepted");setSelected(null);}} className="btn-primary" style={{background:"#15803d"}}>✓ Accept</button>
                  <button onClick={()=>{updateStatus(selected.id,"rejected");setSelected(null);}} className="btn-danger">✗ Reject</button>
                </>
              )}
              <button onClick={()=>setSelected(null)} className="btn-secondary" style={{marginLeft:"auto"}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
