/**
 * useRealIP — Real public + private IP detection
 * Uses ipify + ipapi.co for geo, WebRTC for private IPs
 * EL5 MediProcure / ProcurBosse
 */
import { useState, useEffect } from "react";

export interface RealIPInfo {
  publicIP: string;
  privateIPs: string[];
  city: string;
  region: string;
  country: string;
  org: string;
  isp: string;
  timezone: string;
  lat: number;
  lon: number;
  fetching: boolean;
  error: string | null;
}

const EMPTY: RealIPInfo = {
  publicIP:"", privateIPs:[], city:"", region:"", country:"",
  org:"", isp:"", timezone:"", lat:0, lon:0, fetching:true, error:null
};

async function getPublicIP(): Promise<string> {
  const services = [
    "https://api.ipify.org?format=json",
    "https://api64.ipify.org?format=json",
    "https://api.my-ip.io/v1/ip.json",
  ];
  for (const url of services) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const d = await r.json();
      const ip = d.ip || d.IP || d.ipAddress;
      if (ip) return ip;
    } catch {}
  }
  return "";
}

async function getGeoInfo(ip: string): Promise<Partial<RealIPInfo>> {
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    return {
      city: d.city || "", region: d.region || "", country: d.country_name || "",
      org: d.org || "", isp: d.org || "", timezone: d.timezone || "",
      lat: d.latitude || 0, lon: d.longitude || 0,
    };
  } catch {}
  return {};
}

async function getPrivateIPs(): Promise<string[]> {
  const ips: string[] = [];
  try {
    const pc = new (window as any).RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("");
    await pc.createOffer().then((o: any) => pc.setLocalDescription(o));
    await new Promise<void>(res => {
      pc.onicecandidate = (e: any) => {
        if (e?.candidate?.candidate) {
          const m = e.candidate.candidate.match(/(\d{1,3}(\.\d{1,3}){3})/);
          if (m && !ips.includes(m[1])) ips.push(m[1]);
        } else { res(); }
      };
      setTimeout(res, 2500);
    });
    pc.close();
  } catch {}
  if (!ips.length) ips.push("127.0.0.1");
  return ips;
}

export function useRealIP(): RealIPInfo {
  const [info, setInfo] = useState<RealIPInfo>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [publicIP, privateIPs] = await Promise.all([getPublicIP(), getPrivateIPs()]);
        if (cancelled) return;
        setInfo(p => ({ ...p, publicIP, privateIPs, fetching: true }));
        if (publicIP) {
          const geo = await getGeoInfo(publicIP);
          if (!cancelled) setInfo(p => ({ ...p, ...geo, fetching: false }));
        } else {
          if (!cancelled) setInfo(p => ({ ...p, fetching: false, error: "Could not detect IP" }));
        }
      } catch (e: any) {
        if (!cancelled) setInfo(p => ({ ...p, fetching: false, error: e.message }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return info;
}
