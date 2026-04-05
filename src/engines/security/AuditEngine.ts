/** EL5 MediProcure v5.8 — Blockchain Audit Engine */
import { supabase } from "@/integrations/supabase/client";

export interface AuditEvent {
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export class AuditEngine {
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      await (supabase as any).rpc('log_security_audit', {
        p_action: event.action,
        p_entity_type: event.entityType || null,
        p_entity_id: event.entityId || null,
        p_old_values: event.oldValues ? JSON.stringify(event.oldValues) : null,
        p_new_values: event.newValues ? JSON.stringify(event.newValues) : null,
      });
    } catch (e) { console.warn('Audit log error:', e); }
  }

  async getAuditTrail(entityType: string, entityId: string, limit = 50) {
    const { data } = await (supabase as any)
      .from('security_audit_chain')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }

  async checkSODViolations() {
    const conflictingRoles = [
      ['requisitioner', 'procurement_officer'],
      ['procurement_officer', 'warehouse_officer'],
    ];
    const violations = [];
    for (const [r1, r2] of conflictingRoles) {
      const { data } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', r1);
      if (data) {
        for (const { user_id } of data) {
          const { data: d2 } = await (supabase as any)
            .from('user_roles').select('user_id').eq('user_id', user_id).eq('role', r2);
          if (d2?.length) violations.push({ user_id, roles: [r1, r2] });
        }
      }
    }
    return violations;
  }
}
export const auditEngine = new AuditEngine();
