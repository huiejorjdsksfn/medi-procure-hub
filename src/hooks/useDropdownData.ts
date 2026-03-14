import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDepartments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      setDepartments(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return { departments, loading };
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .eq("status", "active")
        .order("name");
      setSuppliers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return { suppliers, loading };
}

export function useCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("item_categories")
        .select("*")
        .order("name");
      setCategories(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return { categories, loading };
}

export function useItems() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("items")
        .select("*,item_categories(name)")
        .eq("status", "active")
        .order("name");
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return { items, loading };
}
