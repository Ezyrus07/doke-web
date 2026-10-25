#!/usr/bin/env node
'use strict';
// Compile a narrowed, synthetic SQL schema using a read-only catalog snapshot.
// Never query a hosted system from this generator; source is versioned metadata.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'docs/validation/MSG-CATALOG-STAGING-METADATA-20261025.json'),'utf8'));
assert.equal(snapshot.releaseApproved,false);
assert.equal(snapshot.evidence,'SELECT_ONLY_METADATA_NO_CUSTOMER_ROWS');
assert.equal(snapshot.columns.length,48);
assert.equal(snapshot.policies.length,12);
assert.equal(snapshot.constraints.length,25);
const publicTables=['users','orders','conversations','messages'];
const quote=x=>{assert.match(x,/^[a-z][a-z0-9_]*$/);return '"'+x+'"';};
const col={};
for(const entry of snapshot.columns){assert.equal(entry.schema_name,'public');assert.ok(publicTables.includes(entry.table_name));(col[entry.table_name]??=[]).push(entry);}
const sql=[
  '\\set ON_ERROR_STOP on',
  '-- Staging CATALOG-DERIVED metadata (2026-10-25), populated with SYNTHETIC records only.',
  '-- All omitted external FKs and Storage helper logic must be checked separately.',
  'DO $role$ BEGIN',
  " IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;",
  " IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;",
  " IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;",
  'END $role$;',
  'CREATE SCHEMA auth; CREATE SCHEMA private;',
  'GRANT USAGE ON SCHEMA auth, private TO authenticated,service_role;',
  "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
  'GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;'
];
for(const table of publicTables){
 const columns=col[table].map(c=>quote(c.name)+' '+c.type+(c.not_null?' NOT NULL':'')+(c.default_sql?' DEFAULT '+c.default_sql:''));
 sql.push('CREATE TABLE public.'+quote(table)+' (\n '+columns.join(',\n ')+'\n);');
}
let appliedConstraints=0;
let omittedConstraints=[];
for(const c of [...snapshot.constraints].sort((a,b)=>(a.type==='f')-(b.type==='f'))){
 assert.equal(c.schema_name,'public');
 if(c.type==='f'){
   const ref=/REFERENCES ([a-z_]+)\(/i.exec(c.definition);
   if(!ref || !publicTables.includes(ref[1])){omittedConstraints.push(c.name);continue;}
 }
 sql.push('ALTER TABLE public.'+quote(c.table_name)+' ADD CONSTRAINT '+quote(c.name)+' '+c.definition+';');
 appliedConstraints++;
}
assert.equal(appliedConstraints+omittedConstraints.length,25);
assert.ok(omittedConstraints.includes('users_id_fkey'));
sql.push(
 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;',
 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;',
 'ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;',
 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;',
 'GRANT SELECT ON public.users,public.orders,public.conversations,public.messages TO authenticated;',
 'GRANT INSERT,UPDATE ON public.conversations,public.messages TO authenticated;',
 'GRANT ALL ON public.users,public.orders,public.conversations,public.messages TO service_role;'
);
function mkPolicy(p){
 assert.equal(p.permissive,'PERMISSIVE');
 const roles=p.roles.slice(1,-1).split(',').map(x=>quote(x)).join(',');
 return 'CREATE POLICY '+quote(p.name)+' ON '+quote(p.schema_name)+'.'+quote(p.table_name)+
  ' AS PERMISSIVE FOR '+p.cmd+' TO '+roles+
  (p.qual?' USING ('+p.qual+')':'')+
  (p.with_check?' WITH CHECK ('+p.with_check+')':'')+';';
}
for(const p of snapshot.policies.filter(x=>x.schema_name==='public'))sql.push(mkPolicy(p));
sql.push(
 'CREATE SCHEMA storage;',
 'GRANT USAGE ON SCHEMA storage TO authenticated,service_role;',
 'CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text NOT NULL, name text NOT NULL, owner_id text, UNIQUE(bucket_id,name));',
 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;',
 'GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,service_role;',
 "CREATE FUNCTION storage.foldername(p text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(p, '/') $$;",
 '-- Catalog helper body is deliberately NOT copied: older policies will be replaced by MSG-A05.',
 'CREATE FUNCTION private.can_access_transaction_attachment(p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT false $$;',
 'GRANT EXECUTE ON FUNCTION private.can_access_transaction_attachment(text) TO authenticated;'
);
for(const p of snapshot.policies.filter(x=>x.schema_name==='storage'))sql.push(mkPolicy(p));
sql.push(
 "INSERT INTO public.users(id,role,status) VALUES ('11111111-1111-4111-8111-111111111111','client','active'),('22222222-2222-4222-8222-222222222222','professional','active'),('99999999-9999-4999-8999-999999999999','client','active');",
 "INSERT INTO public.orders(id,client_id,professional_id,title,status,external_id) VALUES ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Synthetic order','draft','synthetic-order');",
 "INSERT INTO public.conversations(id,client_id,professional_id,status,external_id) VALUES ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','active','synthetic-conversation'),('55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999','22222222-2222-4222-8222-222222222222','active','synthetic-other-conversation');",
 "INSERT INTO public.messages(id,conversation_id,sender_id,body,status) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','synthetic-a','sent'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','synthetic-b','sent'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999','synthetic-c','delivered'),('dddddddd-dddd-4ddd-8ddd-dddddddddddd','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','','removed');",
 "SELECT 'STAGING_CATALOG_DERIVED_BASELINE_READY';"
);
const destination=path.join(root,'scripts/fixtures/msg-staging-catalog-derived-baseline.sql');
const text=sql.join('\n')+'\n';
if(process.argv.includes('--check')){
 assert.equal(fs.readFileSync(destination,'utf8').replace(/\r\n/g,'\n'),text);
 console.log('CATALOG_FIXTURE_REGEN_CHECK_PASS',{columns:snapshot.columns.length,policies:snapshot.policies.length,constraints:appliedConstraints,externalFksOmitted:omittedConstraints});
}else{
 fs.writeFileSync(destination,text,'utf8');
 console.log('CATALOG_FIXTURE_GENERATED',{columns:snapshot.columns.length,policies:snapshot.policies.length,constraints:appliedConstraints,externalFksOmitted:omittedConstraints});
}
