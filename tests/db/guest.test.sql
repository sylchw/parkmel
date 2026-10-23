-- Q17a: real transaction proof, local fixtures only.
BEGIN;
SELECT public.begin_guest_preview('00000000-0000-0000-0000-000000000080');
UPDATE public.guest_allowance SET consumed_ms=120000 WHERE id='00000000-0000-0000-0000-000000000080';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF (SELECT remaining_ms FROM public.meter_guest_preview('00000000-0000-0000-0000-000000000080',true)) <> 0 THEN RAISE EXCEPTION 'Expired record replenished'; END IF;
END; $$;
RESET ROLE;
UPDATE public.guest_allowance SET started_at=clock_timestamp()-interval '31 days';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF (SELECT remaining_ms FROM public.meter_guest_preview('00000000-0000-0000-0000-000000000080',false)) <> 120000 THEN RAISE EXCEPTION 'Policy reset failed'; END IF;
END; $$;
RESET ROLE;
UPDATE public.guest_allowance SET last_seen_at=clock_timestamp()-interval '1 hour',foreground=true;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF (SELECT remaining_ms FROM public.meter_guest_preview('00000000-0000-0000-0000-000000000080',false)) <> 115000 THEN RAISE EXCEPTION 'Jump cap failed'; END IF;
END; $$;
RESET ROLE;
UPDATE public.guest_allowance SET last_seen_at=clock_timestamp()-interval '1 hour',foreground=false;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF (SELECT remaining_ms FROM public.meter_guest_preview('00000000-0000-0000-0000-000000000080',true)) <> 115000 THEN RAISE EXCEPTION 'Hidden time consumed'; END IF;
END; $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.meter_guest_preview('00000000-0000-0000-0000-000000000080',true);RAISE EXCEPTION 'Guest RPC bypass';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END; $$;
RESET ROLE;
ROLLBACK;
