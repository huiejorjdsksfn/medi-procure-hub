CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_action text)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz, tier text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier          text;
  v_limit         integer;
  v_window_start  timestamptz := date_trunc('hour', now());
  v_reset         timestamptz := date_trunc('hour', now()) + interval '1 hour';
  v_count         integer;
BEGIN
  -- Elevated tier for staff roles gets a much higher hourly ceiling than
  -- regular users; everyone else is "normal". No "blocked" signal exists
  -- yet elsewhere in the schema, so it's never returned here, but callers
  -- already handle it (RateLimitResult.tier includes "blocked").
  SELECT CASE
           WHEN EXISTS (
             SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = p_user_id AND ur.role::text IN ('admin','superadmin','webmaster')
           ) THEN 'elevated'
           ELSE 'normal'
         END
  INTO v_tier;

  v_limit := CASE WHEN v_tier = 'elevated' THEN 1000 ELSE 100 END;

  SELECT count(*) INTO v_count
  FROM public.rate_limit_log rl
  WHERE rl.user_id = p_user_id
    AND rl.action = p_action
    AND rl.recorded_at >= v_window_start;

  RETURN QUERY SELECT (v_count < v_limit), greatest(v_limit - v_count, 0), v_reset, v_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
