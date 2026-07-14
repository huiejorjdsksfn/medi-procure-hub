/**
 * ProcurBosse - Toast Notifications · "Allhands" brand theme
 * Dark card, top accent bar, uppercase wordmark — used for every
 * stamp, approval, and system notification fired via useToast().
 */
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import logoImg from "@/assets/logo.png";

const ACCENT: Record<string, string> = {
  destructive: "#ef4444",
  default: "#2f7edd",
};

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const isErr = variant === "destructive";
        const accent = ACCENT[isErr ? "destructive" : "default"];
        return (
          <Toast key={id} {...props} variant={variant}
            style={{
              background: "linear-gradient(180deg, #1c2229 0%, #161b21 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: `3px solid ${accent}`,
              borderRadius: 12,
              boxShadow: "0 12px 36px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)",
              padding: "14px 16px 14px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              maxWidth: 380,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}>
            {/* Logo badge */}
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}>
              <img src={logoImg} alt="" style={{ width:24, height:24, borderRadius:"50%", objectFit:"contain" as const }} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.4)", textTransform:"uppercase", marginBottom:4 }}>
                ProcurBosse
              </div>
              {title && (
                <ToastTitle style={{ fontSize:13.5, fontWeight:800, color:"#f5f7fa", display:"block", lineHeight:1.3 }}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription style={{ fontSize:12, color:"#98a2b3", marginTop:3, display:"block", lineHeight:1.45 }}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose style={{ position:"static", alignSelf:"flex-start" as const, padding:3, borderRadius:6, border:"none", background:"transparent", cursor:"pointer", color:"rgba(255,255,255,0.4)", lineHeight:0 }} />
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
