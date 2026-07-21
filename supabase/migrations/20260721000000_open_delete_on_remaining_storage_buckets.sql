-- documents and assignments: match the DELETE pattern already used for
-- every other content bucket (avatars, facilities, items, suppliers,
-- signatures, uploads, videos) — any authenticated user.
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can delete assignments" ON storage.objects;
CREATE POLICY "Authenticated users can delete assignments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assignments');

-- backups: already has "backups_service_role_only" (ALL, service_role) as
-- an intentional extra safety net on full-database backup files — the most
-- sensitive bucket in the project. Rather than silently loosen that to
-- "any authenticated user" like the others, add a second DELETE policy
-- scoped to admins specifically, so the Storage Explorer's delete button
-- works for the people using it (admins) without opening backups to every
-- logged-in account.
DROP POLICY IF EXISTS "Admins can delete backups" ON storage.objects;
CREATE POLICY "Admins can delete backups"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'backups' AND is_admin());
