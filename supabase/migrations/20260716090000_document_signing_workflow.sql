-- EL5 MediProcure — Document Signing Workflow
-- Adds public sign-token support to document_signees so external/internal
-- signees can open a one-time link (no login) and sign a document, plus
-- SECURITY DEFINER RPCs so this works safely under RLS with the anon key.
-- Migration: 20260716090000_document_signing_workflow

ALTER TABLE document_signees
  ADD COLUMN IF NOT EXISTS sign_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notify_count int4 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signature_image text;

CREATE UNIQUE INDEX IF NOT EXISTS document_signees_sign_token_idx
  ON document_signees (sign_token);

CREATE INDEX IF NOT EXISTS document_signees_document_id_idx
  ON document_signees (document_id);

-- ── Fetch a signee + parent document by token (anon-safe, no table grants needed) ──
CREATE OR REPLACE FUNCTION get_signee_by_token(p_token uuid)
RETURNS TABLE (
  signee_id uuid, document_id uuid, signee_name text, signee_role text,
  signee_email text, status text, due_date timestamptz, signed_at timestamptz,
  sort_order int4, doc_name text, doc_category text,
  doc_html text, doc_requires_signature boolean, doc_signature_status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT ds.id, ds.document_id, ds.signee_name, ds.signee_role, ds.signee_email,
         ds.status, ds.due_date, ds.signed_at, ds.sort_order,
         d.name, d.category,
         COALESCE(d.signed_html, d.template_html), d.requires_signature, d.signature_status
  FROM document_signees ds
  JOIN documents d ON d.id = ds.document_id
  WHERE ds.sign_token = p_token;
END; $$;

GRANT EXECUTE ON FUNCTION get_signee_by_token(uuid) TO anon, authenticated;

-- ── Submit a signature for a token; auto-completes the document when all signed ──
CREATE OR REPLACE FUNCTION submit_signee_signature(
  p_token uuid, p_signature_image text, p_ip text DEFAULT NULL
) RETURNS TABLE (ok boolean, document_id uuid, all_signed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_doc_id uuid;
  v_pending_count int4;
BEGIN
  SELECT ds.document_id INTO v_doc_id FROM document_signees ds WHERE ds.sign_token = p_token AND ds.status = 'pending';
  IF v_doc_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, false;
    RETURN;
  END IF;

  UPDATE document_signees
  SET status = 'signed', signed_at = now(), signature_image = p_signature_image, ip_address = p_ip
  WHERE sign_token = p_token;

  SELECT count(*) INTO v_pending_count FROM document_signees WHERE document_id = v_doc_id AND status = 'pending';

  IF v_pending_count = 0 THEN
    UPDATE documents SET signature_status = 'completed', sign_completed_at = now() WHERE id = v_doc_id;
  ELSE
    UPDATE documents SET signature_status = 'partial' WHERE id = v_doc_id AND (signature_status IS NULL OR signature_status = 'pending');
  END IF;

  RETURN QUERY SELECT true, v_doc_id, (v_pending_count = 0);
END; $$;

GRANT EXECUTE ON FUNCTION submit_signee_signature(uuid, text, text) TO anon, authenticated;

-- ── Decline a signature request ──
CREATE OR REPLACE FUNCTION decline_signee_signature(p_token uuid, p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE document_signees
  SET status = 'declined', declined_at = now(), notes = COALESCE(p_reason, notes)
  WHERE sign_token = p_token AND status = 'pending';
  RETURN FOUND;
END; $$;

GRANT EXECUTE ON FUNCTION decline_signee_signature(uuid, text) TO anon, authenticated;
