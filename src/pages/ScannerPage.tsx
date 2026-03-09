import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Camera, ScanBarcode, Search, Plus, Package, CheckCircle, Globe, RefreshCw, X, Edit3, Save, AlertTriangle, Wifi, Database, ShoppingCart, Clock, TrendingUp } from "lucide-react";

declare global { interface Window { Html5Qrcode: any; } }

interface ItemInfo { name:string; description?:string; brand?:string; category?:string; imageUrl?:string; source:string; }

/* ── FREE BARCODE LOOKUP APIS ── */
async function lookupOnline(barcode: string): Promise<ItemInfo|null> {
  // 1. Open Food Facts (for food/medicine barcodes)
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if(d.status===1 && d.product) {
      const p = d.product;
      return {
        name: p.product_name || p.product_name_en || "Unknown Product",
        description: [p.brands, p.quantity, p.packaging].filter(Boolean).join(" · "),
        brand: p.brands, category: p.categories?.split(",")[0]?.trim(),
        imageUrl: p.image_front_url,
        source: "Open Food Facts"
      };
    }
  } catch{}

  // 2. Open Product Data (UPC)
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if(r.ok) {
      const d = await r.json();
      if(d.items?.length > 0) {
        const item = d.items[0];
        return {
          name: item.title || "Unknown",
          description: item.description,
          brand: item.brand, category: item.category,
          imageUrl: item.images?.[0],
          source: "UPC Item DB"
        };
      }
    }
  } catch{}

  // 3. Open Beauty Facts (for medical/beauty products)
  try {
    const r = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if(d.status===1 && d.product?.product_name) {
      return {
        name: d.product.product_name,
        brand: d.product.brands,
        category: "Beauty/Medical",
        source: "Open Beauty Facts"
      };
    }
  } catch{}

  return null;
}

export default function ScannerPage() {
  const { user, profile } = useAuth();
  const [scanning,     setScanning]     = useState(false);
  const [barcode,      setBarcode]      = useState("");
  const [manualInput,  setManualInput]  = useState("");
  const [foundItem,    setFoundItem]    = useState<any|null>(null);
  const [onlineInfo,   setOnlineInfo]   = useState<ItemInfo|null>(null);
  const [lookingUp,    setLookingUp]    = useState(false);
  const [scanHistory,  setScanHistory]  = useState<any[]>([]);
  const [categories,   setCategories]   = useState<any[]>([]);
  const [departments,  setDepartments]  = useState<any[]>([]);
  const [showAdd,      setShowAdd]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [editValues,   setEditValues]   = useState<any>({});
  const [recentScans,  setRecentScans]  = useState<any[]>([]);
  const [activeTab,    setActiveTab]    = useState<"scanner"|"history"|"inventory">("scanner");
  const [allItems,     setAllItems]     = useState<any[]>([]);
  const [itemSearch,   setItemSearch]   = useState("");
  const [addForm, setAddForm] = useState({
    name:"", barcode:"", category_id:"", department_id:"",
    unit_of_measure:"piece", unit_price:"", quantity_in_stock:"1",
    reorder_level:"10", item_type:"consumable",
    batch_number:"", expiry_date:"", description:"", location:"",
  });
  const scannerRef = useRef<any>(null);
  const scanDivId  = "qr-reader";

  useEffect(() => {
    // Load html5-qrcode dynamically
    if(!document.getElementById("h5q-script")) {
      const s = document.createElement("script");
      s.id = "h5q-script";
      s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      document.head.appendChild(s);
    }
    fetchCategories(); fetchDepartments(); fetchHistory(); fetchAllItems();
    return () => { stopScanner(); };
  }, []);

  const fetchCategories   = async() => { const{data}=await(supabase as any).from("item_categories").select("*").order("name"); setCategories(data||[]); };
  const fetchDepartments  = async() => { const{data}=await(supabase as any).from("departments").select("*").order("name"); setDepartments(data||[]); };
  const fetchHistory      = async() => { const{data}=await(supabase as any).from("stock_movements").select("*,items(name,barcode)").order("created_at",{ascending:false}).limit(20); setRecentScans(data||[]); };
  const fetchAllItems     = async() => { const{data}=await(supabase as any).from("items").select("*,item_categories(name),departments(name)").order("name").limit(200); setAllItems(data||[]); };

  const startScanner = async() => {
    if(!window.Html5Qrcode){ toast({title:"Scanner loading, try again in 1s",variant:"destructive"}); return; }
    setScanning(true);
    try {
      scannerRef.current = new window.Html5Qrcode(scanDivId);
      await scannerRef.current.start(
        { facingMode:"environment" },
        { fps:10, qrbox:{ width:240, height:120 } },
        (code: string) => { stopScanner(); handleBarcode(code); },
        (_err: any) => {}
      );
    } catch(e:any){ toast({title:"Camera error",description:e.message,variant:"destructive"}); setScanning(false); }
  };
  const stopScanner = async() => {
    if(scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch{}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleBarcode = useCallback(async(code: string) => {
    setBarcode(code); setFoundItem(null); setOnlineInfo(null); setLookingUp(true);
    toast({title:"Barcode scanned",description:code});

    // 1. Check local DB first
    const{data}=await(supabase as any).from("items").select("*,item_categories(name),departments(name)").eq("barcode",code).maybeSingle();
    if(data){ setFoundItem(data); setLookingUp(false); return; }

    // 2. Lookup online
    const info = await lookupOnline(code);
    setOnlineInfo(info);
    setLookingUp(false);

    if(info) {
      // Pre-fill add form
      const cat = categories.find(c=>c.name.toLowerCase().includes((info.category||"").toLowerCase().split(" ")[0]));
      setAddForm(p=>({...p, barcode:code, name:info.name, description:info.description||"", category_id:cat?.id||""}));
      setShowAdd(true);
    } else {
      // Unknown — still let them add it
      setAddForm(p=>({...p, barcode:code}));
    }
  }, [categories]);

  const saveItem = async() => {
    if(!addForm.name.trim()){ toast({title:"Enter item name",variant:"destructive"}); return; }
    setSaving(true);
    const{error}=await(supabase as any).from("items").insert({
      name:addForm.name, barcode:addForm.barcode||barcode,
      category_id:addForm.category_id||null, department_id:addForm.department_id||null,
      unit_of_measure:addForm.unit_of_measure, unit_price:Number(addForm.unit_price)||0,
      quantity_in_stock:Number(addForm.quantity_in_stock)||0,
      reorder_level:Number(addForm.reorder_level)||10,
      item_type:addForm.item_type, batch_number:addForm.batch_number||null,
      expiry_date:addForm.expiry_date||null, description:addForm.description||null,
      location:addForm.location||null, added_by:user?.id, status:"active",
    });
    if(error){ toast({title:"Save failed",description:error.message,variant:"destructive"}); setSaving(false); return; }
    toast({title:"Item saved ✓",description:addForm.name});
    setShowAdd(false); setAddForm({name:"",barcode:"",category_id:"",department_id:"",unit_of_measure:"piece",unit_price:"",quantity_in_stock:"1",reorder_level:"10",item_type:"consumable",batch_number:"",expiry_date:"",description:"",location:""});
    setOnlineInfo(null); setSaving(false);
    // Log movement
    await(supabase as any).from("stock_movements").insert({item_id:null,movement_type:"initial_stock",quantity:Number(addForm.quantity_in_stock)||0,notes:`Added via scanner: ${addForm.barcode||barcode}`,performed_by:user?.id});
    await(supabase as any).from("audit_log").insert({user_id:user?.id,action:"item_added_via_scanner",table_name:"items",details:JSON.stringify({name:addForm.name,barcode:addForm.barcode||barcode})});
    fetchAllItems(); fetchHistory();
  };

  const updateStock = async(itemId:string, delta:number, type:string) => {
    const item = allItems.find(i=>i.id===itemId); if(!item) return;
    const newQty = Math.max(0,(item.quantity_in_stock||0)+delta);
    await(supabase as any).from("items").update({quantity_in_stock:newQty}).eq("id",itemId);
    await(supabase as any).from("stock_movements").insert({item_id:itemId,movement_type:type,quantity:Math.abs(delta),notes:`Scanner ${type}: by ${profile?.full_name}`,performed_by:user?.id});
    toast({title:`Stock ${delta>0?"added":"deducted"}: ${Math.abs(delta)} unit(s)`});
    fetchAllItems(); fetchHistory();
  };

  const filteredItems = itemSearch ? allItems.filter(i=>[i.name,i.barcode,(i.item_categories?.name||"")].some(v=>String(v||"").toLowerCase().includes(itemSearch.toLowerCase()))) : allItems;

  return (
    <div style={{background:"#f4f6f9",minHeight:"calc(100vh - 57px)",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 12px rgba(26,58,107,0.3)"}}>
        <ScanBarcode style={{width:20,height:20,color:"#fff"}}/>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Inventory Scanner</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.55)"}}>Barcode scanning · Real-time lookup · Stock management</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {(["scanner","history","inventory"] as const).map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"5px 14px",background:activeTab===tab?"rgba(255,255,255,0.2)":"transparent",border:"1px solid",borderColor:activeTab===tab?"rgba(255,255,255,0.3)":"transparent",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,color:"#fff",textTransform:"capitalize" as const}}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ══ SCANNER TAB ══ */}
      {activeTab==="scanner" && (
        <div style={{padding:"16px",display:"grid",gridTemplateColumns:"1fr 380px",gap:14,maxWidth:1200,margin:"0 auto"}}>
          {/* Left: Camera + result */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Camera area */}
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <Camera style={{width:14,height:14,color:"#6b7280"}}/>
                <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>Camera Scanner</span>
                {scanning && <span style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto",fontSize:10,color:"#22c55e",fontWeight:700}}><div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e"}} className="animate-pulse"/>LIVE</span>}
              </div>
              <div id={scanDivId} style={{width:"100%",minHeight:scanning?260:0,background:"#000"}}/>
              <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:8}}>
                  {!scanning
                    ? <button onClick={startScanner} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"11px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(26,58,107,0.25)"}}>
                        <Camera style={{width:16,height:16}}/> Start Camera
                      </button>
                    : <button onClick={stopScanner} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"11px",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
                        <X style={{width:16,height:16}}/> Stop Scanner
                      </button>
                  }
                </div>
                {/* Manual input */}
                <div style={{display:"flex",gap:6}}>
                  <div style={{flex:1,position:"relative"}}>
                    <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
                    <input value={manualInput} onChange={e=>setManualInput(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&manualInput&&handleBarcode(manualInput)}
                      placeholder="Enter barcode or item name manually…"
                      style={{width:"100%",paddingLeft:30,paddingRight:10,paddingTop:8,paddingBottom:8,fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,outline:"none"}}/>
                  </div>
                  <button onClick={()=>manualInput&&handleBarcode(manualInput)} style={{padding:"8px 16px",background:"#0078d4",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    Lookup
                  </button>
                </div>
              </div>
            </div>

            {/* Result panel */}
            {(lookingUp||foundItem||onlineInfo||barcode) && (
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                  {lookingUp ? <RefreshCw style={{width:13,height:13,color:"#6b7280"}} className="animate-spin"/> : foundItem ? <CheckCircle style={{width:13,height:13,color:"#22c55e"}}/> : onlineInfo ? <Globe style={{width:13,height:13,color:"#0078d4"}}/> : <AlertTriangle style={{width:13,height:13,color:"#f59e0b"}}/>}
                  <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>
                    {lookingUp?"Looking up…":foundItem?"Found in Inventory":onlineInfo?"Found Online":"Not Found"}
                  </span>
                  {barcode && <span style={{marginLeft:"auto",fontSize:10,background:"#f3f4f6",padding:"2px 8px",borderRadius:4,color:"#6b7280",fontWeight:700,fontFamily:"monospace"}}>{barcode}</span>}
                </div>
                <div style={{padding:"14px 16px"}}>
                  {lookingUp ? (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {["Checking local inventory…","Searching Open Food Facts…","Searching UPC database…"].map((s,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"#6b7280"}}>
                          <RefreshCw style={{width:10,height:10}} className="animate-spin"/> {s}
                        </div>
                      ))}
                    </div>
                  ) : foundItem ? (
                    <div>
                      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                        <div style={{width:50,height:50,borderRadius:8,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <Package style={{width:24,height:24,color:"#0078d4"}}/>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,fontWeight:800,color:"#111827"}}>{foundItem.name}</div>
                          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>
                            {foundItem.item_categories?.name && <span style={{marginRight:8}}>{foundItem.item_categories.name}</span>}
                            {foundItem.item_type && <span style={{background:"#dbeafe",color:"#1d4ed8",padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:700}}>{foundItem.item_type}</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:20,fontWeight:800,color:foundItem.quantity_in_stock<=foundItem.reorder_level?"#dc2626":"#15803d"}}>{foundItem.quantity_in_stock||0}</div>
                          <div style={{fontSize:9,color:"#9ca3af"}}>in stock</div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
                        {[["Unit Price","KES "+(foundItem.unit_price||0),"#374151"],["Unit",""+foundItem.unit_of_measure,"#374151"],["Reorder At",""+foundItem.reorder_level,"#374151"]].map(([l,v,c])=>(
                          <div key={l} style={{background:"#f9fafb",borderRadius:6,padding:"8px 10px"}}>
                            <div style={{fontSize:9,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                            <div style={{fontSize:12,fontWeight:700,color:c}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {/* Stock action buttons */}
                      <div style={{display:"flex",gap:6,marginTop:12}}>
                        <button onClick={()=>updateStock(foundItem.id,1,"stock_in")} style={{flex:1,padding:"8px",background:"#dcfce7",color:"#15803d",border:"1px solid #bbf7d0",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>+ Add Stock</button>
                        <button onClick={()=>updateStock(foundItem.id,-1,"stock_out")} style={{flex:1,padding:"8px",background:"#fee2e2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>- Issue Stock</button>
                        <button onClick={()=>{setEditMode(true);setEditValues({...foundItem});}} style={{flex:1,padding:"8px",background:"#dbeafe",color:"#1d4ed8",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>✏ Edit</button>
                      </div>
                      {foundItem.expiry_date && new Date(foundItem.expiry_date) < new Date(Date.now()+30*86400000) && (
                        <div style={{marginTop:8,padding:"8px 10px",background:"#fef3c7",borderRadius:6,display:"flex",alignItems:"center",gap:6}}>
                          <AlertTriangle style={{width:12,height:12,color:"#f59e0b"}}/><span style={{fontSize:11,color:"#92400e",fontWeight:600}}>Expiring soon: {new Date(foundItem.expiry_date).toLocaleDateString("en-KE")}</span>
                        </div>
                      )}
                    </div>
                  ) : onlineInfo ? (
                    <div>
                      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                        {onlineInfo.imageUrl && <img src={onlineInfo.imageUrl} alt="" style={{width:60,height:60,objectFit:"contain",borderRadius:6,border:"1px solid #e5e7eb"}} onError={e=>(e.target as HTMLImageElement).style.display="none"}/>}
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:800,color:"#111827"}}>{onlineInfo.name}</div>
                          {onlineInfo.brand && <div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{onlineInfo.brand}</div>}
                          {onlineInfo.description && <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{onlineInfo.description}</div>}
                          <div style={{fontSize:9,color:"#0078d4",marginTop:4,display:"flex",alignItems:"center",gap:3}}><Globe style={{width:9,height:9}}/> Source: {onlineInfo.source}</div>
                        </div>
                      </div>
                      <button onClick={()=>setShowAdd(true)} style={{width:"100%",marginTop:12,padding:"9px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
                        <Plus style={{width:13,height:13,display:"inline",marginRight:6}}/>Add to Inventory
                      </button>
                    </div>
                  ) : (
                    <div style={{textAlign:"center",padding:"8px 0"}}>
                      <AlertTriangle style={{width:28,height:28,color:"#f59e0b",margin:"0 auto 8px"}}/>
                      <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>Item not found anywhere</div>
                      <div style={{fontSize:11,color:"#9ca3af",marginBottom:12}}>Barcode: {barcode}</div>
                      <button onClick={()=>setShowAdd(true)} style={{padding:"8px 20px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
                        <Plus style={{width:13,height:13,display:"inline",marginRight:6}}/>Add as New Item
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Stats + recent */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{label:"Total Items",value:allItems.length,color:"#0078d4",icon:Package},{label:"Low Stock",value:allItems.filter(i=>(i.quantity_in_stock||0)<=(i.reorder_level||10)).length,color:"#f59e0b",icon:AlertTriangle},{label:"Out of Stock",value:allItems.filter(i=>(i.quantity_in_stock||0)===0).length,color:"#dc2626",icon:X},{label:"Categories",value:categories.length,color:"#107c10",icon:Database}].map(s=>(
                <div key={s.label} style={{background:"#fff",borderRadius:8,padding:"12px",border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{fontSize:9,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Recent scans */}
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden",flex:1}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:6}}>
                <Clock style={{width:12,height:12,color:"#6b7280"}}/>
                <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>Recent Activity</span>
                <button onClick={fetchHistory} style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af"}}>
                  <RefreshCw style={{width:11,height:11}}/>
                </button>
              </div>
              <div style={{overflowY:"auto",maxHeight:300}}>
                {recentScans.length===0
                  ? <div style={{padding:"20px",textAlign:"center",color:"#9ca3af",fontSize:12}}>No recent activity</div>
                  : recentScans.map((m,i)=>(
                    <div key={i} style={{padding:"9px 14px",borderBottom:"1px solid #f9fafb",display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:m.movement_type==="stock_in"?"#22c55e":m.movement_type==="stock_out"?"#ef4444":"#0078d4",flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>{m.items?.name||"Item"}</div>
                        <div style={{fontSize:9,color:"#9ca3af"}}>{m.movement_type?.replace(/_/g," ")} · {m.quantity} unit(s)</div>
                      </div>
                      <div style={{fontSize:9,color:"#9ca3af"}}>{new Date(m.created_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {activeTab==="history" && (
        <div style={{padding:"16px"}}>
          <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f9fafb",borderBottom:"2px solid #f3f4f6"}}>
                {["Item","Type","Qty","Notes","Date","By"].map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontWeight:700,color:"#9ca3af",fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {recentScans.length===0?<tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:"#9ca3af"}}>No history</td></tr>
                :recentScans.map((m,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f9fafb"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <td style={{padding:"9px 14px",fontWeight:600,color:"#374151"}}>{m.items?.name||"—"}</td>
                    <td style={{padding:"9px 14px"}}>
                      <span style={{background:m.movement_type==="stock_in"?"#dcfce7":m.movement_type==="stock_out"?"#fee2e2":"#dbeafe",color:m.movement_type==="stock_in"?"#15803d":m.movement_type==="stock_out"?"#dc2626":"#1d4ed8",padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700}}>
                        {m.movement_type?.replace(/_/g," ")}
                      </span>
                    </td>
                    <td style={{padding:"9px 14px",color:"#374151",fontWeight:600}}>{m.quantity}</td>
                    <td style={{padding:"9px 14px",color:"#6b7280"}}>{m.notes?.slice(0,40)||"—"}</td>
                    <td style={{padding:"9px 14px",color:"#9ca3af"}}>{new Date(m.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                    <td style={{padding:"9px 14px",color:"#6b7280"}}>{m.performed_by_name||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ INVENTORY TAB ══ */}
      {activeTab==="inventory" && (
        <div style={{padding:"16px"}}>
          <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
              <Search style={{width:12,height:12,color:"#9ca3af"}}/>
              <input value={itemSearch} onChange={e=>setItemSearch(e.target.value)} placeholder="Search inventory…"
                style={{flex:1,border:"none",outline:"none",fontSize:12,color:"#374151"}}/>
              <button onClick={()=>{setShowAdd(true);setBarcode("");}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
                <Plus style={{width:11,height:11}}/> Add Item
              </button>
              <button onClick={fetchAllItems} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af"}}>
                <RefreshCw style={{width:12,height:12}}/>
              </button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f9fafb",borderBottom:"2px solid #f3f4f6"}}>
                  {["Name","Barcode","Category","Department","Stock","Unit","Price","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:"#9ca3af",fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filteredItems.map((item,i)=>(
                    <tr key={item.id} style={{borderBottom:"1px solid #f9fafb",cursor:"pointer"}}
                      onClick={()=>{setBarcode(item.barcode||"");setFoundItem(item);setActiveTab("scanner");}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                      <td style={{padding:"9px 12px",fontWeight:600,color:"#374151"}}>{item.name}</td>
                      <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#6b7280"}}>{item.barcode||"—"}</td>
                      <td style={{padding:"9px 12px",color:"#6b7280"}}>{item.item_categories?.name||"—"}</td>
                      <td style={{padding:"9px 12px",color:"#6b7280"}}>{item.departments?.name||"—"}</td>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{fontWeight:800,color:(item.quantity_in_stock||0)<=(item.reorder_level||10)?item.quantity_in_stock===0?"#dc2626":"#f59e0b":"#15803d"}}>
                          {item.quantity_in_stock||0}
                        </span>
                      </td>
                      <td style={{padding:"9px 12px",color:"#6b7280"}}>{item.unit_of_measure}</td>
                      <td style={{padding:"9px 12px",color:"#374151"}}>KES {Number(item.unit_price||0).toLocaleString()}</td>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{background:item.status==="active"?"#dcfce7":"#f3f4f6",color:item.status==="active"?"#15803d":"#6b7280",padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700}}>{item.status||"active"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD ITEM MODAL ══ */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:12,width:560,maxHeight:"85vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
              <Plus style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>Add Item to Inventory</span>
              {onlineInfo && <span style={{fontSize:9,background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:4,color:"#fff"}}>Pre-filled from {onlineInfo.source}</span>}
              <button onClick={()=>setShowAdd(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff"}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {label:"Item Name *",key:"name",type:"text",full:true},
                {label:"Barcode",key:"barcode",type:"text",full:true},
                {label:"Description",key:"description",type:"text",full:true},
                {label:"Qty in Stock",key:"quantity_in_stock",type:"number"},
                {label:"Reorder Level",key:"reorder_level",type:"number"},
                {label:"Unit Price (KES)",key:"unit_price",type:"number"},
                {label:"Batch Number",key:"batch_number",type:"text"},
                {label:"Expiry Date",key:"expiry_date",type:"date"},
                {label:"Storage Location",key:"location",type:"text"},
              ].map(f=>(
                <div key={f.key} style={{gridColumn:f.full?"1 / -1":"auto"}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>{f.label}</label>
                  <input type={f.type} value={(addForm as any)[f.key]||""} onChange={e=>setAddForm(p=>({...p,[f.key]:e.target.value}))}
                    style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>Category</label>
                <select value={addForm.category_id} onChange={e=>setAddForm(p=>({...p,category_id:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                  <option value="">Select…</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>Department</label>
                <select value={addForm.department_id} onChange={e=>setAddForm(p=>({...p,department_id:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                  <option value="">Select…</option>
                  {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>Unit of Measure</label>
                <select value={addForm.unit_of_measure} onChange={e=>setAddForm(p=>({...p,unit_of_measure:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                  {["piece","box","carton","litre","kg","pack","vial","ampoule","tablet","capsule"].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>Item Type</label>
                <select value={addForm.item_type} onChange={e=>setAddForm(p=>({...p,item_type:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}>
                  {["consumable","medical_supply","equipment","drug","stationery","ppe","other"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{padding:"12px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
              <button onClick={saveItem} disabled={saving} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
                {saving?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Save style={{width:13,height:13}}/>}
                {saving?"Saving…":"Save to Inventory"}
              </button>
              <button onClick={()=>setShowAdd(false)} style={{padding:"9px 16px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
