BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES
 ('00000000-0000-0000-0000-000000000080',null),
 ('00000000-0000-0000-0000-000000000081',now()),
 ('00000000-0000-0000-0000-000000000082',now());
DO $$ BEGIN
 IF (SELECT eligibility FROM public.profile WHERE id='00000000-0000-0000-0000-000000000080') <> 'unverified' THEN RAISE EXCEPTION 'Unconfirmed promoted'; END IF;
 IF (SELECT eligibility FROM public.profile WHERE id='00000000-0000-0000-0000-000000000081') <> 'eligible' THEN RAISE EXCEPTION 'Confirmed not provisioned'; END IF;
END; $$;
UPDATE public.profile SET eligibility='suspended' WHERE id='00000000-0000-0000-0000-000000000080';
UPDATE auth.users SET email_confirmed_at=now() WHERE id='00000000-0000-0000-0000-000000000080';
DO $$ BEGIN
 IF (SELECT eligibility FROM public.profile WHERE id='00000000-0000-0000-0000-000000000080') <> 'suspended' THEN RAISE EXCEPTION 'Suspension overwritten'; END IF;
END; $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000081',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.annotation_draft(owner_id,id,payload,longitude,latitude)
 VALUES(auth.uid(),'00000000-0000-0000-0000-000000000090','{}',145.056,-37.886);
DO $$ BEGIN
 BEGIN
 INSERT INTO public.annotation_draft(owner_id,id,payload,longitude,latitude) VALUES('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000090','{}',145.056,-37.886);
 RAISE EXCEPTION 'Other owner forgery allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000082',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.annotation_draft) <> 0 THEN RAISE EXCEPTION 'Private draft leaked'; END IF;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000080',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN INSERT INTO public.annotation_draft(owner_id,id,payload,longitude,latitude) VALUES(auth.uid(),'00000000-0000-0000-0000-000000000090','{}',145.056,-37.886);
 RAISE EXCEPTION 'Suspended wrote draft'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
ROLLBACK;
