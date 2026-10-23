DO $$ BEGIN
 IF has_function_privilege('anon','public.review_pilot_annotation_current(uuid,text,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous review grant remains';END IF;
 IF NOT has_function_privilege('authenticated','public.review_pilot_annotation_current(uuid,text,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Authenticated review RPC unavailable';END IF;
END;$$;
