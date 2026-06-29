-- EL5 MediProcure v12.0.0 — Performance Indexes
-- Migration: 20260628230000_v12_perf_indexes

CREATE INDEX IF NOT EXISTS idx_req_status        ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_req_created_at    ON requisitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_department_id ON requisitions(department_id);
CREATE INDEX IF NOT EXISTS idx_req_facility_id   ON requisitions(facility_id);
CREATE INDEX IF NOT EXISTS idx_po_status         ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_created_at     ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_supplier_id    ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_requisition_id ON purchase_orders(requisition_id);
CREATE INDEX IF NOT EXISTS idx_po_facility_id    ON purchase_orders(facility_id);
CREATE INDEX IF NOT EXISTS idx_grn_status        ON goods_received(status);
CREATE INDEX IF NOT EXISTS idx_grn_po_id         ON goods_received(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_created_at    ON goods_received(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pv_status         ON payment_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_pv_created_at     ON payment_vouchers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pv_supplier_id    ON payment_vouchers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pv_facility_id    ON payment_vouchers(facility_id);
CREATE INDEX IF NOT EXISTS idx_sup_status        ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_sup_facility_id   ON suppliers(facility_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_read   ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_status      ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notif_created_at  ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ual_user_id       ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ual_created_at    ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ual_action        ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_aq_doc_ref        ON approval_queue(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_sysset_key        ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_sysset_category   ON system_settings(category);
