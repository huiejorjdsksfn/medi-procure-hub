
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Package, Plus, RefreshCw, Search, Eye, Printer, X, Save, CheckCircle } from "lucide-react";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  pending:    {bg:"#fef3c7",color:"#92400e",label:"Pending"},
  received:   {bg:"#dcfce7",color:"#15803d",label:"Received"},
  partial:    {bg:"#dbeafe",color:"#1d4ed8",label:"Partial"},
  rejected:   {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
  inspecting: {bg:"#e0f2fe",color:"#0369a1",label:"Inspecting"},
};

export default function GoodsReceivedPage() {
  const { user, profile, roles } = useAuth();
  const canReceive = roles.includes("admin")||roles.includes("procurement_manager")||roles.includes("warehouse_officer")||roles.includes("inventory_manager");
  const [grns, setGrns]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [stFilter, setStFilter] = useState("all");
  const [viewGrn, setViewGrn] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({grn_number:"",po_reference:"",supplier_name:"",received_date:new Date().toISOString().slice(0,10),delivery_note_number:"",remarks:"",status:"received",items:[] as any[]});

  const load = async()=>{
    setLoading(true);
    const{data}=await(supabase as any).from("goods_received").select("*,goods_received_items(*)").order("created_at",{ascending:false});
    setGrns(data||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const genGrn = ()=>`GRN/EL5H/${new Date().getFullYear()}/${String(Math.floor(1000+Math.random()*9000))}`;

  const save = async()=>{
    setSaving(true);
    const num = form.grn_number||genGrn();
    const{data,error}=await(supabase as any).from("goods_received").insert({
      ...form,grn_number:num,created_by:user?.id,created_by_name:profile?.full_name
    }).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});setSaving(false);return;}
    logAudit(user?.id,profile?.full_name,"create","goods_received",data?.id,{grn:num});
    toast({title:"GRN created ✓",description:num});
    setShowForm(false); load();
    setSaving(false);
  };

  const filtered = grns.filter(g=>{
    if(stFilter!=="all"&&g.status!==stFilter) return false;
    if(search){const q=search.toLowerCase();return(g.grn_number||"").toLowerCase().includes(q)||(g.supplier_name||"").toLowerCase().includes(q)||(g.po_reference||"").toLowerCase().includes(q);}
    return true;
  });

  const inp: React.CSSProperties = {width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",minHeight:"calc(100vh - 60px)"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#065f46,#047857)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,boxShadow:"0 4px 16px rgba(6,95,70,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Package style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Goods Received</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{filtered.length} of {grns.length} records</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={load} disabled={loading}
            style={{padding:"6px 12px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",lineHeight:0}}>
            <RefreshCw style={{width:13,height:13,...(loading?{animation:"spin 1s linear infinite"}:{})}}/>
          </button>
          {canReceive&&<button onClick={()=>setShowForm(true)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.92)",color:"#065f46",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
            <Plus style={{width:13,height:13}}/>New GRN
          </button>}
        </div>
      </div>
      {/* Status chips */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        {[{id:"all",label:`All (${grns.length})`},...Object.entries(STATUS_CFG).map(([k,v])=>({id:k,label:`${v.label} (${grns.filter(g=>g.status===k).length})`}))].map(f=>(
          <button key={f.id} onClick={()=>setStFilter(f.id)}
            style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?"#047857":"#e5e7eb"}`,background:stFilter===f.id?"#047857":"#fff",color:stFilter===f.id?"#fff":"#374151",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {f.label}
          </button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search GRN, supplier, PO…"
            style={{padding:"6px 12px 6px 26px",border:"1.5px solid #e5e7eb",borderRadius:20,fontSize:12,outline:"none",width:220}}/>
        </div>
      </div>
      {/* Table */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"linear-gradient(90deg,#065f46,#047857)"}}>
              {["GRN Number","PO Reference","Supplier","Received Date","Status","Actions"].map(h=>(
                <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?(<tr><td colSpan={6} style={{padding:24,textAlign:"center"}}>
              <RefreshCw style={{width:16,height:16,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/>
            </td></tr>):filtered.length===0?(<tr><td colSpan={6} style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No goods received records</td></tr>):
            filtered.map((g,i)=>{
              const s=STATUS_CFG[g.status]||{bg:"#f3f4f6",color:"#6b7280",label:g.status};
              return(
              <tr key={g.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f9fafb"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0fdf4"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#f9fafb"}>
                <td style={{padding:"10px 14px",fontWeight:800,color:"#047857",fontFamily:"monospace"}} onClick={()=>setViewGrn(g)}>{g.grn_number}</td>
                <td style={{padding:"10px 14px",color:"#374151"}} onClick={()=>setViewGrn(g)}>{g.po_reference||"—"}</td>
                <td style={{padding:"10px 14px",fontWeight:600,color:"#1f2937"}} onClick={()=>setViewGrn(g)}>{g.supplier_name||"—"}</td>
                <td style={{padding:"10px 14px",color:"#6b7280"}} onClick={()=>setViewGrn(g)}>{g.received_date?new Date(g.received_date).toLocaleDateString("en-KE"):g.created_at?new Date(g.created_at).toLocaleDateString("en-KE"):"—"}</td>
                <td style={{padding:"10px 14px"}} onClick={()=>setViewGrn(g)}>
                  <span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span>
                </td>
                <td style={{padding:"10px 14px"}}>
                  <button onClick={()=>setViewGrn(g)} style={{padding:"4px 8px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,cursor:"pointer",lineHeight:0}}>
                    <Eye style={{width:12,height:12,color:"#15803d"}}/>
                  </button>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      {/* View modal */}
      {viewGrn&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",justifyContent:"flex-end"}} onClick={()=>setViewGrn(null)}>
          <div style={{width:"min(460px,100%)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",background:"linear-gradient(90deg,#065f46,#047857)",display:"flex",alignItems:"center",gap:8}}>
              <Package style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>{viewGrn.grn_number}</span>
              <button onClick={()=>setViewGrn(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}>
                <X style={{width:12,height:12}}/>
              </button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
              {[["PO Reference",viewGrn.po_reference],["Supplier",viewGrn.supplier_name],["Received Date",viewGrn.received_date?new Date(viewGrn.received_date).toLocaleDateString("en-KE"):"—"],["Delivery Note",viewGrn.delivery_note_number||"—"],["Status",viewGrn.status],["Created By",viewGrn.created_by_name||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{v||"—"}</span>
                </div>
              ))}
              {viewGrn.remarks&&<div style={{padding:12,background:"#f9fafb",borderRadius:8,fontSize:12,color:"#374151"}}>{viewGrn.remarks}</div>}
              {(viewGrn.goods_received_items||[]).length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",marginBottom:8}}>Received Items ({viewGrn.goods_received_items.length})</div>
                  {viewGrn.goods_received_items.map((it:any,i:number)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px dashed #f3f4f6",fontSize:12}}>
                      <span style={{color:"#374151"}}>{it.item_name||it.description||"—"}</span>
                      <span style={{fontWeight:700,color:"#065f46"}}>Qty: {it.quantity_received||it.quantity||0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* New GRN form */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(520px,94vw)",padding:20,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:900,color:"#1f2937",margin:0}}>New Goods Received Note</h3>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:18,height:18,color:"#9ca3af"}}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["PO Reference","po_reference"],["Supplier Name","supplier_name"],["Delivery Note No.","delivery_note_number"]].map(([l,k])=>(
                <div key={k}>
                  <label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label>
                  <input value={(form as any)[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              <div>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Received Date</label>
                <input type="date" value={form.received_date} onChange={e=>setForm(p=>({...p,received_date:e.target.value}))} style={inp}/>
              </div>
              <div style={{gridColumn:"span 2"}}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Remarks</label>
                <textarea value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} rows={2}
                  style={{...inp,resize:"vertical" as const,fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#065f46",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}
                {saving?"Saving…":"Create GRN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
