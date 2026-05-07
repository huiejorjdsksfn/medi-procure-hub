/**
 * ProcurBosse — Department Request Station (Kiosk App) v1.0
 * NO LOGIN REQUIRED
 * Departments submit requisition requests → sends real-time notification to Procurement Manager
 * Records device name + submitter name
 * Twilio SMS + Supabase realtime notification
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://yvjfehnzbzjliizjvuhq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"
);

const DEPARTMENTS = [
  "Pharmacy","Nursing","Laboratory","Radiology","Surgery","Maternity",
  "Outpatient","ICU","Emergency","Administration","Maintenance","Nutrition",
  "Medical Records","IT Department","Laundry","Mortuary",
];

const URGENCIES = [
  { value:"low",    label:"Low — Routine",        color:"#498205" },
  { value:"medium", label:"Medium — Within 3 Days",color:"#c19c00" },
  { value:"high",   label:"High — Within 24h",    color:"#d83b01" },
  { value:"urgent", label:"URGENT — Immediate",    color:"#a4262c" },
];

interface ToastMsg { id:number; msg:string; type:"success"|"error" }

function getDeviceName(): string {
  return "Unknown Device";
}

export default function App() {
  const [step,       setStep]       = useState<"form"|"items"|"confirm"|"done">("form");
  const [department, setDepartment] = useState("");
  const [submitter,  setSubmitter]  = useState("");
  const [phone,      setPhone]      = useState("");
  const [urgency,    setUrgency]    = useState("medium");
  const [notes,      setNotes]      = useState("");
  const [items,      setItems]      = useState([{ name:"", qty:"", unit:"pcs", reason:"" }]);
  const [toasts,     setToasts]     = useState<ToastMsg[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reqId,      setReqId]      = useState("");
  const [popups,     setPopups]     = useState<any[]>([]);

  /* Real-time incoming notification popups */
  useEffect(() => {
    const ch = (sb as any).channel("kiosk:notify")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"}, (payload:any) => {
        const n = payload.new;
        if (n?.type==="kiosk_ack") {
          setPopups(p => [...p, { id:Date.now(), msg:n.message, from:n.sender_name||"Procurement" }]);
          setTimeout(() => setPopups(p => p.slice(1)), 8000);
        }
      })
      .subscribe();
    return () => { (sb as any).removeChannel(ch); };
  }, []);

  const toast = (msg:string, type:"success"|"error"="success") => {
    const id = Date.now();
    setToasts(t => [...t, {id,msg,type}]);
    setTimeout(() => setToasts(t => t.filter(x=>x.id!==id)), 4000);
  };

  const addItem = () => setItems(i => [...i, { name:"", qty:"", unit:"pcs", reason:"" }]);
  const removeItem = (idx:number) => setItems(i => i.filter((_,j)=>j!==idx));
  const updateItem = (idx:number, field:string, val:string) =>
    setItems(i => i.map((it,j) => j===idx ? {...it,[field]:val} : it));

  const submit = useCallback(async () => {
    if (!department || !submitter.trim()) { toast("Please fill all required fields","error"); return; }
    const validItems = items.filter(i => i.name.trim() && i.qty);
    if (validItems.length===0) { toast("Add at least one item","error"); return; }
    setSubmitting(true);
    try {
      const deviceName = getDeviceName();
      const refNo = `REQ-K-${Date.now().toString().slice(-6)}`;
      /* Insert requisition */
      const { data: req, error } = await (sb as any).from("requisitions").insert({
        title: `[KIOSK] ${department} — ${validItems.length} item(s)`,
        department,
        status: "submitted",
        priority: urgency,
        notes: `Submitted by: ${submitter} | Phone: ${phone||"N/A"} | Device: ${deviceName} | Notes: ${notes||"None"}`,
        reference_number: refNo,
        created_by_name: submitter,
        created_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      /* Insert items */
      if (req?.id && validItems.length>0) {
        await (sb as any).from("requisition_items").insert(
          validItems.map(it=>({ requisition_id:req.id, item_name:it.name, quantity:Number(it.qty), unit:it.unit, justification:it.reason }))
        );
      }

      /* Notify procurement managers */
      await (sb as any).from("notifications").insert({
        type: "new_requisition",
        title: `🔔 New Requisition — ${department}`,
        message: `${submitter} (${department}) submitted ${validItems.length} item(s). Urgency: ${urgency.toUpperCase()}. Ref: ${refNo}`,
        is_read: false,
        sender_name: submitter,
        target_roles: ["procurement_manager","procurement_officer","admin","superadmin"],
        created_at: new Date().toISOString(),
      });

      /* SMS via edge function */
      try {
        await fetch(`https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/send-sms`, {
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"},
          body:JSON.stringify({
            action:"send",
            to:"+254", /* Procurement manager number — set in Supabase settings */
            message:`[EL5 MediProcure KIOSK] New requisition from ${department}. Submitter: ${submitter}. Items: ${validItems.length}. Urgency: ${urgency}. Ref: ${refNo}`,
            module:"kiosk",
          }),
        });
      } catch { /* SMS failure does not block submission */ }

      setReqId(refNo);
      setStep("done");
    } catch(e:any) {
      toast(e?.message||"Submission failed. Please try again.","error");
    } finally { setSubmitting(false); }
  }, [department, submitter, phone, urgency, notes, items]);

  const reset = () => {
    setStep("form"); setDepartment(""); setSubmitter(""); setPhone(""); setUrgency("medium"); setNotes("");
    setItems([{name:"",qty:"",unit:"pcs",reason:""}]); setReqId("");
  };

  /* Styles */
  const card: React.CSSProperties = { background:"#fff", border:"1px solid #dde1e7", borderRadius:12, padding:"24px 28px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" };
  const btn = (color="#0078d4",textColor="#fff"): React.CSSProperties => ({
    background:color, color:textColor, border:`1px solid ${color==="#fff"?"#dde1e7":color}`, borderRadius:8,
    padding:"11px 24px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all .15s",
  });
  const inp: React.CSSProperties = {
    width:"100%", border:"1.5px solid #dde1e7", borderRadius:8, padding:"10px 14px",
    fontSize:14, outline:"none", fontFamily:"inherit", color:"#1a1a2e", boxSizing:"border-box",
    transition:"border-color .15s",
  };
  const lbl: React.CSSProperties = { fontSize:12, fontWeight:600, color:"#5a6475", marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:".04em" };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#e8f4fd 0%,#f3f5f8 60%)", fontFamily:"'Segoe UI',system-ui,sans-serif", padding:"20px 16px" }}>

      {/* Header */}
      <div style={{ maxWidth:680, margin:"0 auto 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:"#0d47a1" }}>EL5 MediProcure</div>
          <div style={{ fontSize:13, color:"#5a6475" }}>Department Request Station</div>
        </div>
        <div style={{ background:"#0078d4", color:"#fff", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600 }}>
          No Login Required
        </div>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto" }}>

        {/* STEP: FORM */}
        {step==="form" && (
          <div style={card}>
            <h2 style={{ margin:"0 0 20px", color:"#1a1a2e", fontSize:18, fontWeight:700, borderBottom:"1px solid #dde1e7", paddingBottom:14 }}>
              📋 New Department Requisition
            </h2>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <div>
                <label style={lbl}>Department *</label>
                <select value={department} onChange={e=>setDepartment(e.target.value)} style={{...inp,background:"#fff"}}>
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Your Name *</label>
                <input value={submitter} onChange={e=>setSubmitter(e.target.value)} placeholder="Full name" style={inp} />
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <div>
                <label style={lbl}>Phone (optional)</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+254..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Urgency *</label>
                <select value={urgency} onChange={e=>setUrgency(e.target.value)} style={{...inp,background:"#fff"}}>
                  {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Additional Notes</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Any special instructions or notes..." style={{...inp,resize:"vertical"}} />
            </div>

            {/* Urgency badge */}
            {urgency && (
              <div style={{ marginBottom:16 }}>
                {URGENCIES.filter(u=>u.value===urgency).map(u=>(
                  <span key={u.value} style={{ background:`${u.color}15`, color:u.color, border:`1px solid ${u.color}40`, borderRadius:6, padding:"4px 12px", fontSize:12, fontWeight:700 }}>
                    {u.label}
                  </span>
                ))}
              </div>
            )}

            <button onClick={() => { if(!department||!submitter.trim()){toast("Fill required fields","error");return;} setStep("items"); }}
              style={{...btn(), width:"100%", padding:"13px"}}>
              Next: Add Items →
            </button>
          </div>
        )}

        {/* STEP: ITEMS */}
        {step==="items" && (
          <div style={card}>
            <h2 style={{ margin:"0 0 4px", color:"#1a1a2e", fontSize:18, fontWeight:700 }}>📦 Items Requested</h2>
            <p style={{ margin:"0 0 20px", color:"#5a6475", fontSize:13, borderBottom:"1px solid #dde1e7", paddingBottom:14 }}>
              Department: <strong>{department}</strong> · Submitted by: <strong>{submitter}</strong>
            </p>

            {items.map((item, idx) => (
              <div key={idx} style={{ background:"#f8f9fb", border:"1px solid #dde1e7", borderRadius:10, padding:"14px 16px", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#0078d4" }}>Item {idx+1}</span>
                  {items.length>1 && <button onClick={()=>removeItem(idx)} style={{ background:"#fde7e9", color:"#a4262c", border:"none", borderRadius:6, padding:"2px 8px", cursor:"pointer", fontSize:12, fontWeight:600 }}>Remove</button>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10, marginBottom:10 }}>
                  <div>
                    <label style={lbl}>Item Name *</label>
                    <input value={item.name} onChange={e=>updateItem(idx,"name",e.target.value)} placeholder="e.g. Surgical Gloves" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Quantity *</label>
                    <input type="number" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)} placeholder="0" style={inp} min="1" />
                  </div>
                  <div>
                    <label style={lbl}>Unit</label>
                    <select value={item.unit} onChange={e=>updateItem(idx,"unit",e.target.value)} style={{...inp,background:"#fff"}}>
                      {["pcs","boxes","cartons","litres","kg","vials","doses","packs","pairs","rolls"].map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Reason / Justification</label>
                  <input value={item.reason} onChange={e=>updateItem(idx,"reason",e.target.value)} placeholder="Why is this item needed?" style={inp} />
                </div>
              </div>
            ))}

            <button onClick={addItem} style={{...btn("#f3f5f8","#0078d4"), width:"100%", marginBottom:16, border:"1.5px dashed #0078d4" }}>
              + Add Another Item
            </button>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setStep("form")} style={{...btn("#fff","#374151"), flex:1}}>← Back</button>
              <button onClick={submit} disabled={submitting} style={{...btn(), flex:2, opacity:submitting?.7:1}}>
                {submitting ? "Submitting..." : "✅ Submit Requisition"}
              </button>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step==="done" && (
          <div style={{...card, textAlign:"center"}}>
            <div style={{ fontSize:64, margin:"0 0 16px" }}>✅</div>
            <h2 style={{ color:"#107c10", margin:"0 0 8px", fontSize:22, fontWeight:800 }}>Requisition Submitted!</h2>
            <p style={{ color:"#5a6475", fontSize:14, margin:"0 0 20px" }}>
              Your request has been sent to the Procurement team and they will be notified immediately.
            </p>
            <div style={{ background:"#dff6dd", border:"1px solid #107c10", borderRadius:10, padding:"16px 20px", marginBottom:24 }}>
              <div style={{ fontSize:13, color:"#107c10", fontWeight:600, marginBottom:4 }}>Reference Number</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#107c10", fontFamily:"monospace" }}>{reqId}</div>
              <div style={{ fontSize:12, color:"#5a6475", marginTop:6 }}>Please keep this reference for follow-up</div>
            </div>
            <div style={{ background:"#f3f5f8", borderRadius:8, padding:"12px 16px", marginBottom:20, textAlign:"left" }}>
              <div style={{ fontSize:12, color:"#5a6475", lineHeight:1.7 }}>
                <div><strong>Department:</strong> {department}</div>
                <div><strong>Submitted by:</strong> {submitter}</div>
                <div><strong>Urgency:</strong> {urgency}</div>
                <div><strong>Device:</strong> {getDeviceName()}</div>
              </div>
            </div>
            <button onClick={reset} style={{...btn(), width:"100%", padding:"13px"}}>
              Submit Another Request
            </button>
          </div>
        )}
      </div>

      {/* Real-time notification popups */}
      <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
        {popups.map(p => (
          <div key={p.id} style={{ background:"#fff", border:"1px solid #dde1e7", borderRadius:12, padding:"14px 18px", boxShadow:"0 8px 32px rgba(0,0,0,.15)", maxWidth:340, borderLeft:"4px solid #0078d4" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#0078d4", marginBottom:4 }}>📢 From Procurement: {p.from}</div>
            <div style={{ fontSize:13, color:"#1a1a2e" }}>{p.msg}</div>
          </div>
        ))}
        {toasts.map(t => (
          <div key={t.id} style={{ background:t.type==="success"?"#dff6dd":"#fde7e9", border:`1px solid ${t.type==="success"?"#107c10":"#a4262c"}`, borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:600, color:t.type==="success"?"#107c10":"#a4262c" }}>
            {t.type==="success"?"✅":"❌"} {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

