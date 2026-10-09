// Explicit one-file migration runner. Preview is the default; no implicit migration sweep.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2),file=args.find(arg=>!arg.startsWith('--'));
if(!file||args.some(arg=>arg.startsWith('--')&&arg!=='--apply')){console.error('Usage: node scripts/apply-hosted-migration.mjs <migration.sql> [--apply]');process.exit(1);}
if(file!==basename(file)||!/^\d{3}_[a-z0-9_]+\.sql$/.test(file)){console.error('Choose a migration filename from supabase/migrations.');process.exit(1);}
const path=resolve('supabase/migrations',file);
if(!existsSync(path)){console.error('Migration does not exist.');process.exit(1);}
const sql=readFileSync(path,'utf8');
console.log(`Migration: ${file}\nSHA-256: ${createHash('sha256').update(sql).digest('hex')}`);
if(!args.includes('--apply')){console.log('Preview only. Use --apply with PARKMEL_DATABASE_URL configured locally to execute.');process.exit(0);}
let connection;
try{connection=new URL(process.env.PARKMEL_DATABASE_URL??'');if(!['postgres:','postgresql:'].includes(connection.protocol)||!connection.hostname||!connection.username)throw new Error();}catch{console.error('Set PARKMEL_DATABASE_URL in your local environment. Never commit or share it.');process.exit(1);}
if(connection.searchParams.has('sslmode')&&connection.searchParams.get('sslmode')!=='require'){console.error('Hosted connections require sslmode=require.');process.exit(1);}
// Credentials go through the child environment, never command arguments or logs.
const env={...process.env,PGHOST:connection.hostname,PGPORT:connection.port||'5432',PGUSER:decodeURIComponent(connection.username),PGPASSWORD:decodeURIComponent(connection.password),PGDATABASE:decodeURIComponent(connection.pathname.slice(1))||'postgres',PGSSLMODE:'require',PGCONNECT_TIMEOUT:'15'};
delete env.PARKMEL_DATABASE_URL;
const result=spawnSync(process.env.PARKMEL_PSQL_BIN||'psql',['-X','--set=ON_ERROR_STOP=1','--file=-'],{input:sql,env,encoding:'utf8',maxBuffer:4*1024*1024});
if(result.error){console.error('Could not start psql. Install the PostgreSQL client or set PARKMEL_PSQL_BIN to its executable.');process.exit(1);}
if(result.stdout)process.stdout.write(result.stdout);
// Server diagnostics may mention SQL/data; do not print connection strings or passwords.
if(result.stderr){let diagnostic=result.stderr;for(const secret of [process.env.PARKMEL_DATABASE_URL,env.PGPASSWORD])if(secret)diagnostic=diagnostic.replaceAll(secret,'[redacted]');process.stderr.write(diagnostic);}
process.exit(result.status??1);
