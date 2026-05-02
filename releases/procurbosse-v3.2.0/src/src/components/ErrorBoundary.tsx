/**
 * ProcurBosse - Global Error Boundary v2.0
 * Catches ALL React rendering errors, shows recovery UI
 * Prevents blank screens on any page crash
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { Component, ReactNode, ErrorInfo } from "react";
import { T } from "@/lib/theme";

interface Props { children: ReactNode; fallback?: ReactNode; pageName?: string; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; retryCount: number; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console for debugging
    console.error("[ProcurBosse ErrorBoundary]", error, errorInfo);
    // Could send to audit log here
    try {
      const errLog = JSON.parse(localStorage.getItem("el5_error_log") || "[]");
      errLog.push({ ts: Date.now(), message: error.message, page: window.location.pathname });
      if (errLog.length > 20) errLog.shift();
      localStorage.setItem("el5_error_log", JSON.stringify(errLog));
    } catch {}
  }

  handleRetry = () => {
    this.setState(s => ({ hasError: false, error: null, errorInfo: null, retryCount: s.retryCount + 1 }));
  };

  handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const errMsg = this.state.error?.message || "Unknown error";
    const isSchemaCache = errMsg.includes("schema cache") || errMsg.includes("column") || errMsg.includes("relation");
    const isNetwork = errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("NetworkError");

    return (
      <div style={{
        minHeight: "calc(100vh - 120px)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24,
        fontFamily: "var(--font-family,'Segoe UI',system-ui,sans-serif)",
        background: "var(--color-page-bg,#f3f5f8)",
      }}>
        <div style={{
          background: "#fff", borderRadius: 12, padding: "32px 36px",
          maxWidth: 520, width: "100%", textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: "1px solid #fee2e2",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.error, marginBottom: 8 }}>
            {this.props.pageName ? `${this.props.pageName} Error` : "Page Error"}
          </div>
          <div style={{ fontSize: 13, color: T.fgMuted, marginBottom: 20, lineHeight: 1.6 }}>
            {isSchemaCache
              ? "Database schema mismatch detected. The page will reload to refresh the schema cache."
              : isNetwork
              ? "Network connection issue. Please check your internet connection."
              : "An unexpected error occurred on this page."}
          </div>

          {/* Error details */}
          <div style={{
            background: "#fef2f2", borderRadius: 8, padding: "10px 14px",
            marginBottom: 20, textAlign: "left", border: "1px solid #fecaca",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>Error Details</div>
            <div style={{ fontSize: 11, color: "#7f1d1d", fontFamily: "monospace", wordBreak: "break-word" }}>
              {errMsg.length > 200 ? errMsg.substring(0, 200) + "..." : errMsg}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {this.state.retryCount < 3 && (
              <button onClick={this.handleRetry} style={{
                padding: "9px 20px", borderRadius: 6, border: "none",
                background: T.primary, color: "#fff", fontWeight: 700,
                fontSize: 13, cursor: "pointer",
              }}>
                Retry Page
              </button>
            )}
            <button onClick={this.handleGoHome} style={{
              padding: "9px 20px", borderRadius: 6, border: `1px solid ${T.border}`,
              background: "#fff", color: T.fg, fontWeight: 600,
              fontSize: 13, cursor: "pointer",
            }}>
              Go to Dashboard
            </button>
            <button onClick={this.handleRefresh} style={{
              padding: "9px 20px", borderRadius: 6, border: `1px solid ${T.border}`,
              background: "#fff", color: T.fgMuted, fontWeight: 600,
              fontSize: 13, cursor: "pointer",
            }}>
              Refresh App
            </button>
          </div>

          <div style={{ fontSize: 11, color: T.fgDim, marginTop: 16 }}>
            EL5 MediProcure · ProcurBosse v9.0
            {this.state.retryCount > 0 && ` · Retry ${this.state.retryCount}`}
          </div>
        </div>
      </div>
    );
  }
}

/** Wrapper for lazy-loaded pages with auto error boundary */
export function withErrorBoundary(component: ReactNode, pageName?: string) {
  return <ErrorBoundary pageName={pageName}>{component}</ErrorBoundary>;
}

export default ErrorBoundary;
