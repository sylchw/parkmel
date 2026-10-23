BEGIN;
CREATE TABLE public.guest_allowance (
 id uuid PRIMARY KEY,
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 consumed_ms bigint NOT NULL DEFAULT 0 CHECK (consumed_ms BETWEEN 0 AND 120000),
 foreground boolean NOT NULL DEFAULT true
);
ALTER TABLE public.guest_allowance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_allowance FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.begin_guest_preview(identifier uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.guest_allowance(id) VALUES(identifier) ON CONFLICT(id) DO NOTHING;
$$;
CREATE FUNCTION public.meter_guest_preview(identifier uuid, active boolean)
RETURNS TABLE(guest_id uuid, remaining_ms bigint, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.guest_allowance%ROWTYPE; tick timestamptz := clock_timestamp(); elapsed bigint;
BEGIN
 IF active IS NULL THEN RAISE EXCEPTION 'Foreground state required'; END IF;
 SELECT g.* INTO r FROM public.guest_allowance g WHERE g.id=identifier FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 IF tick-r.started_at >= interval '30 days' THEN
  r.started_at:=tick; r.consumed_ms:=0; r.last_seen_at:=tick;
 END IF;
 elapsed:=CASE WHEN r.foreground THEN LEAST(5000,GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(tick-r.last_seen_at))*1000)::bigint)) ELSE 0 END;
 r.consumed_ms:=LEAST(120000,r.consumed_ms+elapsed);
 UPDATE public.guest_allowance g SET started_at=r.started_at,consumed_ms=r.consumed_ms,
   last_seen_at=GREATEST(tick,r.last_seen_at),foreground=active WHERE g.id=identifier;
 RETURN QUERY SELECT r.id,120000-r.consumed_ms,r.started_at+interval '30 days';
END;
$$;
REVOKE ALL ON FUNCTION public.begin_guest_preview(uuid),public.meter_guest_preview(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_guest_preview(uuid),public.meter_guest_preview(uuid,boolean) TO service_role;
COMMIT;
