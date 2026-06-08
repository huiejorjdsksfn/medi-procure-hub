import { useCachedDropdown } from "@/hooks/useCachedDropdown";

export function useDepartments() {
  const dd = useCachedDropdown({ table: "departments", select: "id,name,code,is_active", order: "name", pageSize: 100 });
  return { departments: dd.rows, loading: dd.loading, reload: dd.reload, loadMore: dd.loadMore, hasMore: dd.hasMore };
}

export function useSuppliers() {
  const dd = useCachedDropdown({ table: "suppliers", select: "id,name,email,phone,category,status", filter: { status: "active" }, order: "name", pageSize: 100, searchColumns: ["name", "email", "category"] });
  return { suppliers: dd.rows, loading: dd.loading, reload: dd.reload, loadMore: dd.loadMore, hasMore: dd.hasMore };
}

export function useCategories() {
  const dd = useCachedDropdown({ table: "item_categories", select: "id,name,description", order: "name", pageSize: 100 });
  return { categories: dd.rows, loading: dd.loading, reload: dd.reload, loadMore: dd.loadMore, hasMore: dd.hasMore };
}

export function useItems() {
  const dd = useCachedDropdown({ table: "items", select: "id,name,sku,unit,status,quantity_in_stock,item_categories(name)", filter: { status: "active" }, order: "name", pageSize: 100, searchColumns: ["name", "sku"] });
  return { items: dd.rows, loading: dd.loading, reload: dd.reload, loadMore: dd.loadMore, hasMore: dd.hasMore };
}
