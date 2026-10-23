BEGIN;
-- Shared durable counters: no process-local limits and no browser access.
CREATE TABLE public.api_read_usage(subject text NOT NULL CHECK(length(subject)<=100),action text NOT NULL,minute_start timestamptz NOT NULL,minute_count integer NOT NULL,day_start date NOT NULL,day_count integer NOT NULL,updated_at timestamptz NOT NULL,PRIMARY KEY(subject,action));
ALTER TABLE public.api_read_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_read_usage FROM PUBLIC,anon,authenticated;
CREATE INDEX api_read_usage_expiry ON public.api_read_usage(updated_at);
CREATE FUNCTION public.consume_read_quota(subject text,action text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE minute_limit integer;day_limit integer;stamp timestamptz:=clock_timestamp();minute_bucket timestamptz;day_bucket date;r public.api_read_usage;retry integer;daily boolean;account_role text;
BEGIN
 CASE action WHEN 'map' THEN minute_limit:=20;day_limit:=500; WHEN 'search' THEN minute_limit:=30;day_limit:=300; WHEN 'preview' THEN minute_limit:=120;day_limit:=3000; ELSE RAISE EXCEPTION 'Unknown read budget';END CASE;
 IF subject IS NULL OR length(subject)>100 OR subject !~ '^(account|guest):[a-zA-Z0-9_-]+$' THEN RAISE EXCEPTION 'Invalid quota subject';END IF;
 IF subject LIKE 'account:%' THEN
  SELECT p.role INTO account_role FROM public.profile p JOIN auth.users u ON u.id=p.id WHERE p.id=substring(subject FROM 9)::uuid AND p.eligibility='eligible' AND u.email_confirmed_at IS NOT NULL;
  IF account_role IS NULL THEN RAISE EXCEPTION 'Eligible account required' USING ERRCODE='42501';END IF;
  IF account_role IN ('admin','reviewer') THEN RETURN jsonb_build_object('allowed',true);END IF;
 END IF;
 minute_bucket:=date_trunc('minute',stamp);day_bucket:=(stamp AT TIME ZONE 'Australia/Melbourne')::date;
 INSERT INTO public.api_read_usage VALUES(subject,action,minute_bucket,0,day_bucket,0,stamp) ON CONFLICT ON CONSTRAINT api_read_usage_pkey DO NOTHING;
 SELECT * INTO r FROM public.api_read_usage u WHERE u.subject=consume_read_quota.subject AND u.action=consume_read_quota.action FOR UPDATE;
 stamp:=clock_timestamp();minute_bucket:=date_trunc('minute',stamp);day_bucket:=(stamp AT TIME ZONE 'Australia/Melbourne')::date;
 IF r.minute_start<>minute_bucket THEN r.minute_start:=minute_bucket;r.minute_count:=0;END IF;
 IF r.day_start<>day_bucket THEN r.day_start:=day_bucket;r.day_count:=0;END IF;
 daily:=r.day_count>=day_limit;
 IF daily OR r.minute_count>=minute_limit THEN
  retry:=greatest(1,ceil(extract(epoch FROM (CASE WHEN daily THEN ((day_bucket+1)::timestamp AT TIME ZONE 'Australia/Melbourne') ELSE minute_bucket+interval '1 minute' END)-stamp))::integer);
  RETURN jsonb_build_object('allowed',false,'daily',daily,'retryAfter',retry);
 END IF;
 UPDATE public.api_read_usage u SET minute_start=r.minute_start,minute_count=r.minute_count+1,day_start=r.day_start,day_count=r.day_count+1,updated_at=stamp WHERE u.subject=consume_read_quota.subject AND u.action=consume_read_quota.action;
 RETURN jsonb_build_object('allowed',true);
END;$$;
REVOKE ALL ON FUNCTION public.consume_read_quota(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_read_quota(text,text) TO service_role;
-- Only the trusted application server may supply an account ID.
CREATE FUNCTION public.limited_account_sections(actor uuid,west double precision,south double precision,east double precision,north double precision) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE budget jsonb;result jsonb;old_claims text:=current_setting('request.jwt.claims',true);old_sub text:=current_setting('request.jwt.claim.sub',true);
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profile p JOIN auth.users u ON u.id=p.id WHERE p.id=actor AND p.eligibility='eligible' AND p.role IN ('user','reviewer','admin') AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Eligible account required' USING ERRCODE='42501';END IF;
 budget:=public.consume_read_quota('account:'||actor::text,'map');
 IF NOT (budget->>'allowed')::boolean THEN RETURN jsonb_build_object('rateLimited',budget);END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 result:=public.pilot_section_schedules(west,south,east,north);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.limited_account_sections(uuid,double precision,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.limited_account_sections(uuid,double precision,double precision,double precision,double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.town_centre_preview(text) TO service_role;
CREATE FUNCTION public.prune_read_usage() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ DELETE FROM public.api_read_usage WHERE updated_at<now()-interval '2 days'; $$;
REVOKE ALL ON FUNCTION public.prune_read_usage() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prune_read_usage() TO service_role;
COMMIT;
