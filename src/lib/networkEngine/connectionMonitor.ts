/**
 * EL5 MediProcure — Network Engine: Connection Monitor
 * Reads real link quality (Network Information API where available,
 * RTT sampling fallback everywhere else) and classifies it into a
 * quality tier that the rest of the engine adapts to.
 *
 * ProcurBosse · Embu Level 5 Hospital
 */

export type NetQuality = "fast" | "medium" | "slow" | "offline";

export interface NetSnapshot {
  quality: NetQuality;
  effectiveType: string;   // "4g" | "3g" | "2g" | "slow-2g" | "unknown"
  downlinkMbps: number;    // estimated
  rttMs: number;           // estimated round-trip
  saveData: boolean;       // user has data-saver on
  online: boolean;
}

type Listener = (snap: NetSnapshot) => void;

const RTT_SLOW_MS = 600;
const RTT_MEDIUM_MS = 250;

class ConnectionMonitor {
  private listeners = new Set<Listener>();
  private snapshot: NetSnapshot = {
    quality: "medium",
    effectiveType: "unknown",
    downlinkMbps: 5,
    rttMs: 200,
    saveData: false,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
  };
  private rttSamples: number[] = [];

  constructor() {
    if (typeof window === "undefined") return;
    this.refresh();
    window.addEventListener("online", () => this.refresh());
    window.addEventListener("offline", () => this.refresh());
    const conn = this.getConnection();
    if (conn?.addEventListener) {
      conn.addEventListener("change", () => this.refresh());
    }
  }

  private getConnection(): any {
    const n = navigator as any;
    return n.connection || n.mozConnection || n.webkitConnection || null;
  }

  /** Record an actual measured round-trip from a live request (self-calibrating) */
  recordRTT(ms: number): void {
    this.rttSamples.push(ms);
    if (this.rttSamples.length > 8) this.rttSamples.shift();
    this.refresh();
  }

  private classify(effectiveType: string, rtt: number, online: boolean): NetQuality {
    if (!online) return "offline";
    if (effectiveType === "slow-2g" || effectiveType === "2g") return "slow";
    if (effectiveType === "3g") return "medium";
    if (rtt >= RTT_SLOW_MS) return "slow";
    if (rtt >= RTT_MEDIUM_MS) return "medium";
    return "fast";
  }

  refresh(): NetSnapshot {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    const conn = this.getConnection();
    const sampledRTT =
      this.rttSamples.length > 0
        ? this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length
        : conn?.rtt ?? 200;

    const effectiveType = conn?.effectiveType ?? "unknown";
    const downlinkMbps = conn?.downlink ?? 5;
    const saveData = !!conn?.saveData;

    this.snapshot = {
      quality: this.classify(effectiveType, sampledRTT, online),
      effectiveType,
      downlinkMbps,
      rttMs: Math.round(sampledRTT),
      saveData,
      online,
    };
    this.listeners.forEach((l) => l(this.snapshot));
    return this.snapshot;
  }

  get(): NetSnapshot {
    return this.snapshot;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  /** Suggested concurrency ceiling for the current link quality */
  suggestedConcurrency(): number {
    switch (this.snapshot.quality) {
      case "fast": return 8;
      case "medium": return 4;
      case "slow": return 2;
      case "offline": return 0;
    }
  }

  /** Suggested per-request timeout (ms) for the current link quality */
  suggestedTimeoutMs(): number {
    switch (this.snapshot.quality) {
      case "fast": return 6000;
      case "medium": return 10000;
      case "slow": return 18000;
      case "offline": return 4000;
    }
  }
}

export const connectionMonitor = new ConnectionMonitor();
