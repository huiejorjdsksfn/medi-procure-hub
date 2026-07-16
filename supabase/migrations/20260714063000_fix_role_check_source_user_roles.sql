-- CORRECTION: earlier policies in this session checked profiles.role,
-- but the app's actual authoritative role table is user_roles (see
-- is_admin(): EXISTS (SELECT 1 FROM user_roles WHERE user_id=auth.uid()
-- AND role IN ('admin','database_admin'))). profiles.role only holds
-- finance_manager/finance_officer/requisitioner in this dataset — using
-- it would have locked real admins out of ip_access_rules/user_sessions
-- instead of restricting them to admins as intended.

DROP POLICY IF EXISTS "Admins manage ip_access_rules" ON ip_access_rules;
CREATE POLICY "Admins manage ip_access_rules" ON ip_access_rules
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin')));

DROP POLICY IF EXISTS "Admins manage user_sessions" ON user_sessions;
CREATE POLICY "Admins manage user_sessions" ON user_sessions
FOR ALL
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin'))
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin'))
);

DROP POLICY IF EXISTS "admin_read_odbc_access_log" ON odbc_access_log;
CREATE POLICY "admin_read_odbc_access_log" ON odbc_access_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin'))
);
