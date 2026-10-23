BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('00000000-0000-0000-0000-000000000301',now()),('00000000-0000-0000-0000-000000000302',now()),('00000000-0000-0000-0000-000000000303',now()),('00000000-0000-0000-0000-000000000304',NULL);
UPDATE public.profile SET eligibility='eligible',role='user' WHERE id='00000000-0000-0000-0000-000000000301';
UPDATE public.profile SET eligibility='eligible',role='admin' WHERE id='00000000-0000-0000-0000-000000000302';
UPDATE public.profile SET eligibility='eligible',role='reviewer' WHERE id='00000000-0000-0000-0000-000000000303';
DO $$ DECLARE b jsonb;subject text:='account:00000000-0000-0000-0000-000000000301'; BEGIN
 IF has_function_privilege('anon','public.consume_read_quota(text,text)','EXECUTE') OR has_function_privilege('authenticated','public.consume_read_quota(text,text)','EXECUTE') THEN RAISE EXCEPTION 'Counter bypass';END IF;
 IF has_table_privilege('authenticated','public.api_read_usage','SELECT') OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.api_read_usage'::regclass) THEN RAISE EXCEPTION 'Usage counters exposed';END IF;
 FOR i IN 1..20 LOOP b:=public.consume_read_quota(subject,'map');IF NOT (b->>'allowed')::boolean THEN RAISE EXCEPTION 'Normal request blocked';END IF;END LOOP;
 b:=public.consume_read_quota(subject,'map');IF (b->>'allowed')::boolean OR (b->>'daily')::boolean OR (b->>'retryAfter')::integer NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Minute limit not enforced';END IF;
 UPDATE public.api_read_usage SET minute_start=minute_start-interval '1 minute',day_count=499 WHERE api_read_usage.subject='account:00000000-0000-0000-0000-000000000301';
 b:=public.consume_read_quota(subject,'map');IF NOT (b->>'allowed')::boolean THEN RAISE EXCEPTION 'New minute blocked';END IF;
 b:=public.consume_read_quota(subject,'map');IF (b->>'allowed')::boolean OR NOT (b->>'daily')::boolean THEN RAISE EXCEPTION 'Daily limit not enforced';END IF;
 UPDATE public.api_read_usage SET day_start=day_start-1,minute_start=minute_start-interval '1 minute' WHERE api_read_usage.subject='account:00000000-0000-0000-0000-000000000301';
 IF NOT (public.consume_read_quota(subject,'map')->>'allowed')::boolean THEN RAISE EXCEPTION 'New Melbourne day blocked';END IF;
 IF NOT (public.consume_read_quota(subject,'search')->>'allowed')::boolean THEN RAISE EXCEPTION 'Budgets not separate';END IF;
 FOR i IN 1..520 LOOP
 IF NOT (public.consume_read_quota('account:00000000-0000-0000-0000-000000000302','map')->>'allowed')::boolean OR NOT (public.consume_read_quota('account:00000000-0000-0000-0000-000000000303','search')->>'allowed')::boolean THEN RAISE EXCEPTION 'Moderator restriction';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.api_read_usage WHERE api_read_usage.subject IN ('account:00000000-0000-0000-0000-000000000302','account:00000000-0000-0000-0000-000000000303')) THEN RAISE EXCEPTION 'Moderator charged';END IF;
 BEGIN PERFORM public.consume_read_quota('account:00000000-0000-0000-0000-000000000304','map');RAISE EXCEPTION 'Unverified account admitted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM public.limited_account_sections('00000000-0000-0000-0000-000000000301',145.055,-37.8865,145.056,-37.886);
 IF coalesce(current_setting('request.jwt.claim.sub',true),'')<>'' THEN RAISE EXCEPTION 'Actor claims leaked';END IF;
END;$$;
ROLLBACK;
