import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

function ToastIcon({ variant }: { variant?: string }) {
  const s: React.CSSProperties = { width: 16, height: 16, flexShrink: 0, marginTop: 1 };
  if (variant === "destructive") return <XCircle style={{ ...s, color: "#ef4444" }} />;
  return <CheckCircle style={{ ...s, color: "#22c55e" }} />;
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isErr = variant === "destructive";
        return (
          <Toast key={id} {...props} variant={variant}
            style={{
              background: isErr ? "#fff1f2" : "#f0fdf4",
              border: `1.5px solid ${isErr ? "#fca5a5" : "#86efac"}`,
              borderLeft: `4px solid ${isErr ? "#ef4444" : "#22c55e"}`,
              borderRadius: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              maxWidth: 380,
              fontFamily: "'Segoe UI',system-ui,sans-serif",
            }}>
            <ToastIcon variant={variant} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <ToastTitle style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isErr ? "#991b1b" : "#166534",
                  lineHeight: 1.3,
                  display: "block",
                }}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription style={{
                  fontSize: 12,
                  color: isErr ? "#b91c1c" : "#15803d",
                  marginTop: 3,
                  lineHeight: 1.4,
                  display: "block",
                }}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose style={{
              position: "static",
              alignSelf: "flex-start",
              padding: 3,
              borderRadius: 5,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: isErr ? "#dc2626" : "#16a34a",
              opacity: 0.6,
              lineHeight: 0,
            }} />
          </Toast>
        );
      })}
      <ToastViewport style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 420,
        width: "100%",
        padding: 0,
        margin: 0,
        listStyle: "none",
        outline: "none",
      }} />
    </ToastProvider>
  );
}
