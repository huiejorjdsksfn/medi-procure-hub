/**
 * useOnlineStatus — ProcurBosse v12.0.0
 * Real-time online/offline detection with reconnection callback
 */
import { useState, useEffect } from "react";

export function useOnlineStatus(onReconnect?: () => void) {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline  = () => { setOnline(true);  onReconnect?.(); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [onReconnect]);

  return online;
}
