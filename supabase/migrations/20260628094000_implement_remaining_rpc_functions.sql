-- security_audit_chain + log_security_audit (AuditEngine's hash-chained audit trail)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.security_audit_chain (
  id          bigserial PRIMARY KEY,
  user_id     uuid,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  old_values  jsonb,
  new_values  jsonb,
  prev_hash   text,
  hash        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_chain ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_audit_chain_rw ON public.security_audit_chain
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.log_security_audit(
  p_action text, p_entity_type text DEFAULT NULL, p_entity_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL, p_new_values jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_prev_hash text;
  v_uid       uuid := auth.uid();
  v_payload   text;
  v_hash      text;
BEGIN
  SELECT hash INTO v_prev_hash FROM public.security_audit_chain ORDER BY id DESC LIMIT 1;
  v_payload := coalesce(v_prev_hash,'') || coalesce(v_uid::text,'') || p_action
               || coalesce(p_entity_type,'') || coalesce(p_entity_id,'')
               || coalesce(p_old_values::text,'') || coalesce(p_new_values::text,'') || now()::text;
  v_hash := encode(extensions.digest(v_payload, 'sha256'), 'hex');

  INSERT INTO public.security_audit_chain(user_id, action, entity_type, entity_id, old_values, new_values, prev_hash, hash)
  VALUES (v_uid, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, v_prev_hash, v_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_audit(text,text,text,jsonb,jsonb) TO authenticated;

-- upsert_session (useSessionTracker's per-page-view session heartbeat)
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS token  text,
  ADD COLUMN IF NOT EXISTS page   text,
  ADD COLUMN IF NOT EXISTS module text;

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_idx ON public.user_sessions(token) WHERE token IS NOT NULL;

-- Drop first: an earlier migration may have defined this with parameter
-- defaults that differ from this signature; CREATE OR REPLACE cannot
-- remove/alter defaults on an existing function.
DROP FUNCTION IF EXISTS public.upsert_session(text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.upsert_session(
  p_token text, p_page text, p_module text, p_ip text, p_user_agent text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_id FROM public.user_sessions WHERE token = p_token;

  IF v_id IS NULL THEN
    INSERT INTO public.user_sessions(user_id, token, page, module, ip_address, user_agent, started_at, last_activity, is_active, request_count)
    VALUES (v_uid, p_token, p_page, p_module, p_ip, p_user_agent, now(), now(), true, 1)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.user_sessions
       SET page = p_page, module = p_module, last_activity = now(),
           is_active = true, request_count = coalesce(request_count,0) + 1,
           user_agent = coalesce(p_user_agent, user_agent),
           ip_address = coalesce(p_ip, ip_address)
     WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_session(text,text,text,text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
