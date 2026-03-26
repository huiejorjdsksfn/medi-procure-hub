/**
 * NetworkGuard — IP restriction — RENDER TRANSPARENT
 * Never blocks rendering. Checks IP in background only after user logs in.
 * Fail-open: if anything goes wrong, access is allowed.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only check once per user session, and only after auth is resolved
    if (!user || checkedRef.current === user.id) return;
    checkedRef.current = user.id;

    // Run IP check completely in background — never blocks render
    (async () => {
      try {
        // Check if IP restriction is even enabled
        const { data: setting } = await (supabase as any)
          .from("system_settings")
          .select("value")
          .eq("key", "ip_restriction_enabled")
          .maybeSingle();

        if (setting?.value !== "true") return; // disabled — do nothing

        // Get IP with 3s timeout
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        let ip = "unknown";
        try {
          const r = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
          ip = (await r.json()).ip || "unknown";
        } catch { /* ignore — fail open */ }
        clearTimeout(t);

        // Check whitelist
        const { data: whitelist } = await (supabase as any)
          .from("network_whitelist")
          .select("cidr,label,active")
          .eq("active", true);

        if (!whitelist?.length) return; // no rules — allow all

        // Simple CIDR check
        const ipNum = (s: string) => s.split(".").reduce((a: number, b: string) => (a << 8) | +b, 0) >>> 0;
        const inCidr = (ip: string, cidr: string) => {
          const [net, bits] = cidr.split("/");
          if (!bits) return ip === net;
          const mask = bits === "0" ? 0 : (~0 << (32 - +bits)) >>> 0;
          return (ipNum(ip) & mask) === (ipNum(net) & mask);
        };

        const allowed = whitelist.some((e: any) => {
          try { return inCidr(ip, e.cidr); } catch { return false; }
        });

        if (!allowed) {
          // Log and sign out — but give user 5s to see a message
          console.warn(`[NetworkGuard] IP ${ip} not in whitelist — signing out`);
          setTimeout(() => supabase.auth.signOut(), 5000);
        }
      } catch (e) {
        // Any error = fail open, never block
        console.warn("[NetworkGuard] check failed (fail-open):", e);
      }
    })();
  }, [user]);

  // ALWAYS render children — zero blocking
  return <>{children}</>;
}
