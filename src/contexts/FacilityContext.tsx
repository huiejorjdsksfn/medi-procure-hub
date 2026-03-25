/**
 * FacilityContext — Multi-location support
 * Tracks current facility, switches context, loads per-facility settings
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Facility {
  id: string;
  code: string;
  name: string;
  short_name: string;
  location: string;
  type: string;
  level: string;
  county: string;
  sub_county?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  primary_color: string;
  accent_color: string;
  is_active: boolean;
  is_main: boolean;
  parent_id?: string;
}

interface FacilityContextType {
  facility: Facility | null;
  allFacilities: Facility[];
  userFacilities: Facility[];
  loading: boolean;
  switchFacility: (id: string) => void;
  isMain: boolean;
  facilityFilter: string | null; // null = current facility
}

const MAIN_FACILITY_KEY = "procurbosse_facility_id";

const FacilityContext = createContext<FacilityContextType>({
  facility: null,
  allFacilities: [],
  userFacilities: [],
  loading: true,
  switchFacility: () => {},
  isMain: true,
  facilityFilter: null,
});

export const useFacility = () => useContext(FacilityContext);

export function FacilityProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [userFacilities, setUserFacilities] = useState<Facility[]>([]);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFacilities = useCallback(async () => {
    try {
      // Load all active facilities
      const { data: all } = await (supabase as any)
        .from("facilities").select("*").eq("is_active", true).order("is_main", { ascending: false }).order("name");
      const facilities: Facility[] = all || [];
      setAllFacilities(facilities);

      let accessible = facilities;

      // If not admin, filter to user's assigned facilities
      if (user && !roles.includes("admin")) {
        const { data: uf } = await (supabase as any)
          .from("user_facilities").select("facility_id").eq("user_id", user.id);
        const ids = new Set((uf || []).map((r: any) => r.facility_id));
        if (ids.size > 0) {
          accessible = facilities.filter(f => ids.has(f.id));
        }
      }
      setUserFacilities(accessible);

      // Restore last selected facility from localStorage
      const saved = localStorage.getItem(MAIN_FACILITY_KEY);
      const found = saved ? accessible.find(f => f.id === saved) : null;
      const main = accessible.find(f => f.is_main) || accessible[0] || null;
      setFacility(found || main);
    } catch (e) {
      console.error("FacilityProvider error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, roles]);

  useEffect(() => { loadFacilities(); }, [loadFacilities]);

  const switchFacility = useCallback((id: string) => {
    const f = allFacilities.find(f => f.id === id);
    if (f) {
      setFacility(f);
      localStorage.setItem(MAIN_FACILITY_KEY, id);
    }
  }, [allFacilities]);

  return (
    <FacilityContext.Provider value={{
      facility,
      allFacilities,
      userFacilities,
      loading,
      switchFacility,
      isMain: facility?.is_main ?? true,
      facilityFilter: facility?.id ?? null,
    }}>
      {children}
    </FacilityContext.Provider>
  );
}
