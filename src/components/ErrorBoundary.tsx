/**
 * ProcurBosse — ErrorBoundary v5.0 NUCLEAR
 * On crash: auto-reload after 3s (no ugly error screen shown to users)
 * Shows branded blue reload screen — NOT "Application failed to start"
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { Component, ReactNode } from "react";

interface Props  { children: ReactNode; }
interface State  { crashed: boolean; countdown: number; }

export default class ErrorBoundary extends Component<Props, State> {
  private timer: ReturnType<typeof setInterval> | null = null;

  state: State = { crashed: false, countdown: 5 };

  static getDerivedStateFromError(): Partial<State> {
    return { crashed: true, countdown: 5 };
  }

  componentDidCatch(error: Error) {
    console.error("[ProcurBosse] App error caught by ErrorBoundary:", error?.message);
  }

  componentDidUpdate(_: Props, prev: State) {
    if (this.state.crashed && !prev.crashed) {
      this.timer = setInterval(() => {
        this.setState(s => {
          if (s.countdown <= 1) {
            clearInterval(this.timer!);
            window.location.reload();
            return s;
          }
          return { countdown: s.countdown - 1 };
        });
      }, 1000);
    }
  }

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    // Branded reload screen — no scary error message
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(135deg,#1565c0 0%,#0d47a1 35%,#1a237e 65%,#0a1172 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "#fff", padding: "0 24px" }}>
          {/* Logo */}
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <img src="/icons/icon-48.png" alt="" style={{ width:44, height:44, objectFit:"contain" }}
                 onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>EL5 MediProcure</div>
          <div style={{ fontSize: 14, opacity: .7, marginBottom: 32 }}>Reloading in {this.state.countdown}s...</div>

          {/* Progress ring */}
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.2)",
            borderTopColor: "#fff",
            margin: "0 auto 24px",
            animation: "spin .8s linear infinite",
          }} />

          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#fff", color: "#0d47a1",
              border: "none", borderRadius: 10,
              padding: "12px 32px", fontSize: 15, fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reload Now
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
}
