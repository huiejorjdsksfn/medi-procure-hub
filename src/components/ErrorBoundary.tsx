import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "Unexpected application error",
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("[UI_CRASH]", { error, errorInfo });
  }

  reloadApp = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: 20 }}>
        <div style={{ maxWidth: 520, width: "100%", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 24, boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}>
          <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>Something went wrong</h1>
          <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.6 }}>
            The app crashed before this page could render. Please retry. If it keeps happening, share the error below with support.
          </p>
          <pre style={{ marginTop: 16, padding: 12, background: "#0f172a", color: "#e2e8f0", borderRadius: 10, overflowX: "auto", fontSize: 12 }}>
            {this.state.errorMessage}
          </pre>
          <button onClick={this.reloadApp} style={{ marginTop: 16, border: "none", background: "#2563eb", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
