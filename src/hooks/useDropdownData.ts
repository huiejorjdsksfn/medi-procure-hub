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

export function useChartOfAccounts() {
  const dd = useCachedDropdown({ table: "chart_of_accounts", select: "id,account_code,account_name,account_type,category", order: "account_code", pageSize: 200, searchColumns: ["account_code", "account_name"] });
  return { accounts: dd.rows, loading: dd.loading, reload: dd.reload, loadMore: dd.loadMore, hasMore: dd.hasMore };
}

export function usePurchaseOrders() {
  const dd = useCachedDropdown({ table: "purchase_orders", select: "id,po_number,supplier_name,status,total_amount", order: "created_at", pageSize: 200, searchColumns: ["po_number", "supplier_name"] });
  return { purchaseOrders: dd.rows, loading: dd.loading, reload: dd.reload, loadMore: dd.loadMore, hasMore: dd.hasMore };
}
