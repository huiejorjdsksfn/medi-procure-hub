/**
 * EL5 MediProcure — useNetworkEngine
 * React hook exposing live connection quality + engine health, so pages
 * can show a "slow connection" banner or throttle background work.
 *
 * ProcurBosse · Embu Level 5 Hospital
 */
import { useEffect, useState } from "react";
import { netEngine, type NetSnapshot } from "@/lib/networkEngine";

export function useNetworkEngine() {
  const [snapshot, setSnapshot] = useState<NetSnapshot>(netEngine.connection.get());

  useEffect(() => {
    const unsub = netEngine.onConnectionChange(setSnapshot);
    return unsub;
  }, []);

  return {
    ...snapshot,
    isSlow: snapshot.quality === "slow" || snapshot.quality === "offline",
    health: () => netEngine.health(),
  };
}
