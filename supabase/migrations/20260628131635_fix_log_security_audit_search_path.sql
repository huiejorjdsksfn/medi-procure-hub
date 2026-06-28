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

NOTIFY pgrst, 'reload schema';
