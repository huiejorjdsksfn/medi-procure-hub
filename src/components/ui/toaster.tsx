import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import logoImg from "@/assets/logo.png";

function ToastIcon({ variant }: { variant?: string }) {
  const s: React.CSSProperties = { width:15, height:15, flexShrink:0 };
  if (variant==="destructive") return <XCircle style={{...s,color:"#ef4444"}} />;
  return <CheckCircle style={{...s,color:"#22c55e"}} />;
}

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const isErr = variant==="destructive";
        return (
          <Toast key={id} {...props} variant={variant}
            style={{
              background: "#fff",
              border: isErr ? "1.5px solid #fca5a5" : "1.5px solid #86efac",
              borderLeft: isErr ? "4px solid #ef4444" : "4px solid #22c55e",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              padding: "12px 14px 12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              maxWidth: 380,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}>
            {/* Logo badge (small) */}
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#f8f8f8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1px solid #e5e7eb" }}>
              <img src={logoImg} alt="" style={{ width:24, height:24, borderRadius:"50%", objectFit:"contain" as const }} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {title && (
                <ToastTitle style={{ fontSize:13, fontWeight:800, color:isErr?"#991b1b":"#166534", display:"block", lineHeight:1.3 }}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription style={{ fontSize:12, color:isErr?"#b91c1c":"#15803d", marginTop:2, display:"block", lineHeight:1.4 }}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose style={{ position:"static", alignSelf:"flex-start" as const, padding:3, borderRadius:6, border:"none", background:"transparent", cursor:"pointer", color:isErr?"#dc2626":"#16a34a", opacity:0.6, lineHeight:0 }} />
          </Toast>
        );
      })}
      <ToastViewport style={{
        position:"fixed", bottom:20, right:20, zIndex:9999,
        display:"flex", flexDirection:"column", gap:8,
        maxWidth:420, width:"100%", padding:0, margin:0,
        listStyle:"none", outline:"none",
      }} />
    </ToastProvider>
  );
}
