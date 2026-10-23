import {spawn} from "node:child_process";
import assert from "node:assert/strict";
export async function checkQuotaConcurrency({sql,context,container,database}){
 if(context!=="colima-parkmel-tests"||container!=="parkmel-testdb"||!/^parkmel_check_\d+$/.test(database))throw Error("Local test database required");
 const id='00000000-0000-0000-0000-000000000320',subject=`account:${id}`;
 sql(`INSERT INTO auth.users(id,email_confirmed_at) VALUES('${id}',now());UPDATE public.profile SET role='user',eligibility='eligible' WHERE id='${id}';INSERT INTO public.api_read_usage VALUES('${subject}','map',date_trunc('minute',now()),0,(now() AT TIME ZONE 'Australia/Melbourne')::date,480,now());`);
 const requests=Array.from({length:40},()=>new Promise((resolve,reject)=>{const child=spawn('docker',['--context',context,'exec','-i',container,'psql','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-q','-A','-t']);let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('close',code=>code===0?resolve(JSON.parse(out.trim())):reject(Error(err)));child.stdin.end(`SET ROLE service_role;SELECT public.consume_read_quota('${subject}','map');`);}));
 const settled=await Promise.allSettled(requests);for(const result of settled)if(result.status==='rejected')throw result.reason;
 const results=settled.map(r=>r.value);assert.equal(results.filter(r=>r.allowed).length,20,'Concurrent requests cannot exceed the remaining twenty reads');assert.equal(results.filter(r=>!r.allowed).length,20);console.log('40 concurrent quota requests: exactly 20 admitted, 20 denied');
}
