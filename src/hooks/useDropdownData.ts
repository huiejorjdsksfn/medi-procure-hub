import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDepartments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("departments").select("*").order("name");
    setDepartments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = (supabase as any).channel("dd-departments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => load())
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [load]);

  return { departments, loading, reload: load };
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("suppliers").select("*").eq("status", "active").order("name");
    setSuppliers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = (supabase as any).channel("dd-suppliers-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, () => load())
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [load]);

  return { suppliers, loading, reload: load };
}

export function useCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("item_categories").select("*").order("name");
    setCategories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = (supabase as any).channel("dd-categories-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "item_categories" }, () => load())
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [load]);

  return { categories, loading, reload: load };
}

export function useItems() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("items").select("*,item_categories(name)").eq("status", "active").order("name");
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = (supabase as any).channel("dd-items-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => load())
      .subscribe();
    return () => (supabase as any).removeChannel(ch);
  }, [load]);

  return { items, loading, reload: load };
}
