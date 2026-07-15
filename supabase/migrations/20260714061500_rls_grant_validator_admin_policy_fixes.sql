-- RLS-grant validator finding: these two policies are named "Admins
-- manage ..." but their actual USING/WITH CHECK clauses are both
-- literal `true`, with roles={public} — meaning every authenticated
-- AND anonymous caller can read/write ip_access_rules (network access
-- control) and user_sessions (session tokens), not just admins. The
-- policy name never matched what it actually granted.

DROP POLICY IF EXISTS "Admins manage ip_access_rules" ON ip_access_rules;
CREATE POLICY "Admins manage ip_access_rules" ON ip_access_rules
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster')));

DROP POLICY IF EXISTS "Admins manage user_sessions" ON user_sessions;
CREATE POLICY "Admins manage user_sessions" ON user_sessions
FOR ALL
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster'))
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','webmaster'))
);
