import { useState, useEffect } from "react";

/** Returns true when viewport width is below the given breakpoint (default 768px).
 *  Safe for SSR — defaults to false until mounted. */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    // Modern API
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      setIsMobile(mq.matches);
      return () => mq.removeEventListener("change", handler);
    } else {
      // Older Safari fallback
      mq.addListener(handler);
      setIsMobile(mq.matches);
      return () => mq.removeListener(handler);
    }
  }, [breakpoint]);

  return isMobile;
}

/** Returns true for tablet range: 768px – 1023px */
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== "undefined"
      ? window.innerWidth >= 768 && window.innerWidth < 1024
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      setIsTablet(mq.matches);
      return () => mq.removeEventListener("change", handler);
    } else {
      mq.addListener(handler);
      setIsTablet(mq.matches);
      return () => mq.removeListener(handler);
    }
  }, []);

  return isTablet;
}

/** Combined breakpoint hook returning the current device class */
export function useDevice(): "phone" | "tablet" | "laptop" | "desktop" {
  const [device, setDevice] = useState<"phone"|"tablet"|"laptop"|"desktop">(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 768)  return "phone";
    if (w < 1024) return "tablet";
    if (w < 1440) return "laptop";
    return "desktop";
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      if (w < 768)  setDevice("phone");
      else if (w < 1024) setDevice("tablet");
      else if (w < 1440) setDevice("laptop");
      else setDevice("desktop");
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return device;
}
