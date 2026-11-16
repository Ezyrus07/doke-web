#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Verifies actual Supabase Storage REST endpoints, never hosted Supabase.
assert.equal(process.env.KONTRAT_ISOLATED_STORAGE_TEST,'true');
const info=JSON.parse(fs.readFileSync(process.env.KONTRAT_LOCAL_STATUS_FILE,'utf8'));
const url=info.API_URL;
const db=info.DB_URL;
const anonKey=info.ANON_KEY;
const serviceKey=info.SERVICE_ROLE_KEY;
const secret=info.JWT_SECRET;
assert.ok(/^http:\/\/127\.0\.0\.1:54321$/.test(url),'REFUSE_NON_LOCAL_API');
assert.ok(/^postgres(?:ql)?:\/\/postgres:[^@]+@127\.0\.0\.1:54322\/postgres$/.test(db),'REFUSE_NON_LOCAL_DATABASE');
assert.ok(anonKey&&serviceKey&&secret);
const bucket='transaction-attachments';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const c='99999999-9999-4999-8999-999999999999';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function jwt(user){
 const now=Math.floor(Date.now()/1000);
 const head=encode({alg:'HS256',typ:'JWT'});
 const payload=encode({sub:user,aud:'authenticated',role:'authenticated',iat:now,exp:now+600});
 const content=head+'.'+payload;
 return content+'.'+crypto.createHmac('sha256',secret).update(content).digest('base64url');
}
const reviewer='88888888-8888-4888-8888-888888888881';
const inactive='88888888-8888-4888-8888-888888888882';
const tokens={a:jwt(a),b:jwt(b),c:jwt(c),reviewer:jwt(reviewer),inactive:jwt(inactive)};
const phase=process.env.KONTRAT_STORAGE_PHASE||'post';
assert.ok(['legacy','post'].includes(phase),'UNKNOWN_STORAGE_PHASE');
// Select one contract before execution, never infer an acceptable error from a failed request.
// These endpoint contracts require confirmation against the pinned Storage image in Etapa B.
const profile=process.env.KONTRAT_STORAGE_HTTP_CONTRACT||'legacy-status-code';
assert.ok(['legacy-status-code','error-codes-v2'].includes(profile),'UNKNOWN_STORAGE_HTTP_CONTRACT');
const legacy=profile==='legacy-status-code';
const failures={
 rls:legacy?{status:400,code:'403',error:'Unauthorized'}:{status:403,code:'AccessDenied'},
 hidden:legacy?{status:400,code:'404',error:'not_found'}:{status:404,code:'NoSuchKey'},
};
async function request(path,{method='GET',as='a',body,upsert=false,contentType,api='storage'}={}){
 assert.ok(['storage','rest'].includes(api));
 assert.ok(as==='service'||as==='anon'||as==='invalid'||Object.hasOwn(tokens,as));
 assert.match(path,/^\/(?!\/)/);
 const headers={'apikey':anonKey,'Authorization':'Bearer '+(as==='service'?serviceKey:as==='anon'?anonKey:as==='invalid'?'invalid-jwt':tokens[as])};
 if(upsert)headers['x-upsert']='true';
 if(contentType)headers['content-type']=contentType;
 if(body!==undefined&&!contentType)headers['content-type']='application/json';
 if(api==='rest')headers.Prefer='return=representation';
 const resp=await fetch(url+(api==='rest'?'/rest/v1':'/storage/v1')+path,{
  method,headers,body:body===undefined?undefined:(typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)),
  redirect:'error',signal:AbortSignal.timeout(15000)
 });
 const buffer=Buffer.from(await resp.arrayBuffer());
 let data;try{data=JSON.parse(buffer.toString('utf8'))}catch{data=null}
 return {status:resp.status,data,buffer,method,actor:as,endpoint:path.split('?')[0]};
}
function expect(res,method,actor,endpoint,status,code,error){
 assert.equal(res.method,method);assert.equal(res.actor,actor);assert.equal(res.endpoint,endpoint);
 const label=phase+' '+method+' '+endpoint+' actor='+actor;
 assert.equal(res.status,status,label+' status');
 if(code!==undefined)assert.equal(String(res.data?.code??res.data?.statusCode??''),code,label+' code');
 if(error!==undefined)assert.equal(res.data?.error,error,label+' error');
 // Never print response bodies, local JWTs or signed URLs.
 console.log(JSON.stringify({phase,method,endpoint,actor,status:res.status,code:code??null}));
 return res;
}
function denied(res,method,actor,endpoint,kind){
 const {status,code,error}=failures[kind];return expect(res,method,actor,endpoint,status,code,error);
}
function sql(query){
 return execFileSync('psql',['-X','-w','-q','-v','ON_ERROR_STOP=1','-A','-t','-d',db,'-c',query],
 {encoding:'utf8',timeout:12000,stdio:['ignore','pipe','pipe']}).trim();
}
function dependencyChecks(item){
 const args=['-X','-w','-q','-v','ON_ERROR_STOP=1','-d',db,'-v','legacy='+(phase==='legacy'?'true':'false')];
 if(item)args.push('-v','attachment_id='+item.attachmentId,'-v','object_path='+item.path);
 args.push('-f','scripts/fixtures/msg-storage-dependency-regressions.sql');
 execFileSync('psql',args,{timeout:12000,stdio:['ignore','pipe','pipe']});
 console.log('DEPENDENCY_SQL_ASSERTIONS_PASS_'+phase.toUpperCase());
}
const objectUrl=(path,b=bucket)=>'/object/'+b+'/'+path.split('/').map(encodeURIComponent).join('/');
const downloadUrl=(path,b=bucket)=>'/object/authenticated/'+b+'/'+path.split('/').map(encodeURIComponent).join('/');
const signUrl=(path,b=bucket)=>'/object/sign/'+b+'/'+path.split('/').map(encodeURIComponent).join('/');
const objectCount=(path,b=bucket)=>sql("SELECT count(*) FROM storage.objects WHERE bucket_id='"+b+"' AND name='"+path+"';");
const content=Buffer.from('%PDF-1.4\n% synthetic Kontrat integration\n%%EOF\n');
const rewrite=Buffer.from('%PDF-1.4\n% BAD OVERWRITE\n%%EOF\n');
async function signedDownload(path,b,actor){
 const endpoint=signUrl(path,b);
 const res=expect(await request(endpoint,{as:actor,method:'POST',body:{expiresIn:60}}),'POST',actor,endpoint,200);
 const signed=res.data?.signedURL||res.data?.signedUrl||res.data?.signed_url;
 assert.equal(typeof signed,'string','signed URL missing');
 const target=new URL(signed,url+'/storage/v1/');
 if(!target.pathname.startsWith('/storage/v1/'))target.pathname='/storage/v1'+(target.pathname.startsWith('/')?'':'/')+target.pathname;
 assert.equal(target.origin,url,'signed URL escaped isolated gateway');
 assert.equal(target.pathname,'/storage/v1/object/sign/'+b+'/'+path.split('/').map(encodeURIComponent).join('/'),'signed URL bucket/path mismatch');
 const response=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200,'signed bearer download');
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),content,'signed bytes differ');
}
async function buckets(){
 for(const id of [bucket,'professional-verification-media']){
  if(sql("SELECT count(*) FROM storage.buckets WHERE id='"+id+"';")==='0'){
   expect(await request('/bucket',{method:'POST',as:'service',body:{id,name:id,public:false,file_size_limit:10485760,allowed_mime_types:['application/pdf']}}),'POST','service','/bucket',200);
  }
  assert.equal(sql("SELECT public FROM storage.buckets WHERE id='"+id+"';"),'f','bucket must remain private');
 }
}
async function kyc(){
 const k='professional-verification-media';
 const path='locked/'+a+'/synthetic-intent/referenced.pdf';
 const unreferenced='locked/'+a+'/synthetic-intent/unreferenced.pdf';
 sql("INSERT INTO auth.users(id) VALUES ('"+reviewer+"'),('"+inactive+"') ON CONFLICT(id) DO NOTHING; "+
 "INSERT INTO public.users(id,role,status) VALUES ('"+reviewer+"','admin','active'),('"+inactive+"','moderator','suspended') ON CONFLICT(id) DO NOTHING; "+
 "INSERT INTO public.professional_identity_verifications(id,user_id,documents) VALUES ('11111111-1111-4111-8111-111111111110','"+a+"',"+
 "jsonb_build_object('document',jsonb_build_object('bucket','"+k+"','path','"+path+"'))) ON CONFLICT(id) DO NOTHING;");
 for(const p of [path,unreferenced]){
  if(objectCount(p,k)==='0')expect(await request(objectUrl(p,k),{method:'POST',as:'service',body:content,contentType:'application/pdf'}),'POST','service',objectUrl(p,k),200);
 }
 for(const actor of ['a','reviewer']){
  expect(await request(downloadUrl(path,k),{as:actor}),'GET',actor,downloadUrl(path,k),200);
  await signedDownload(path,k,actor);
 }
 for(const actor of ['c','inactive','anon']){
  denied(await request(downloadUrl(path,k),{as:actor}),'GET',actor,downloadUrl(path,k),'hidden');
  denied(await request(signUrl(path,k),{as:actor,method:'POST',body:{expiresIn:60}}),'POST',actor,signUrl(path,k),'hidden');
 }
 denied(await request(signUrl(unreferenced,k),{method:'POST',body:{expiresIn:60}}),'POST','a',signUrl(unreferenced,k),'hidden');
 const listing=expect(await request('/object/list/'+k,{method:'POST',body:{prefix:'',limit:100}}),'POST','a','/object/list/'+k,200);
 assert.deepEqual(listing.data,[],'KYC listing exposed objects');
 for(const actor of ['a','reviewer']){
  const route=objectUrl('locked/'+a+'/synthetic-intent/browser-'+actor+'.pdf',k);
  denied(await request(route,{method:'POST',as:actor,body:content,contentType:'application/pdf'}),'POST',actor,route,'rls');
  assert.equal(objectCount('locked/'+a+'/synthetic-intent/browser-'+actor+'.pdf',k),'0');
 }
 const route=objectUrl(path,k);
 denied(await request(route,{method:'PUT',body:rewrite,contentType:'application/pdf'}),'PUT','a',route,'rls');
 denied(await request(route,{method:'POST',body:rewrite,contentType:'application/pdf',upsert:true}),'POST','a',route,'rls');
 denied(await request(route,{method:'DELETE'}),'DELETE','a',route,'rls');
 assert.deepEqual((await request(downloadUrl(path,k))).buffer,content,'KYC evidence changed');
 denied(await request(downloadUrl(path)),'GET','a',downloadUrl(path),'hidden');
 console.log('KYC_REFERENCED_READ_SIGNED_BEARER_AND_BUCKET_ISOLATION_PASS');
}
function invariants(){
 return sql("SELECT jsonb_build_object('kycPolicies',(SELECT jsonb_agg(jsonb_build_array(polname,polcmd,pg_get_expr(polqual,polrelid),pg_get_expr(polwithcheck,polrelid)) ORDER BY polname) FROM pg_policy WHERE polrelid IN ('storage.objects'::regclass,'public.professional_identity_verifications'::regclass) AND (polname LIKE 'professional_%')),"+
 "'helpers',(SELECT jsonb_agg(jsonb_build_array(oid::regprocedure::text,proowner,prosecdef,proacl::text,proconfig::text,md5(prosrc)) ORDER BY oid::regprocedure::text) FROM pg_proc WHERE oid IN ('auth.uid()'::regprocedure,'storage.allow_any_operation(text[])'::regprocedure,'public.current_user_role()'::regprocedure,'public.is_active_admin_or_moderator()'::regprocedure,'public.record_analytics_behavior_event_v1(jsonb)'::regprocedure,'public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz)'::regprocedure)),"+
 "'tables',(SELECT jsonb_agg(jsonb_build_array(oid::regclass::text,relowner,relacl::text,relrowsecurity,relforcerowsecurity) ORDER BY oid::regclass::text) FROM pg_class WHERE oid IN ('public.users'::regclass,'storage.objects'::regclass,'public.professional_identity_verifications'::regclass,'private.analytics_behavior_events_v1'::regclass,'private.analytics_reconciliation_runs_v1'::regclass,'private.analytics_data_quality_rollups_v1'::regclass)),"+
 "'anaCounts',jsonb_build_array((SELECT count(*) FROM private.analytics_behavior_events_v1),(SELECT count(*) FROM private.analytics_reconciliation_runs_v1),(SELECT count(*) FROM private.analytics_data_quality_rollups_v1)),"+
 "'kycDocuments',(SELECT documents FROM public.professional_identity_verifications WHERE id='11111111-1111-4111-8111-111111111110'))::text;");
}
async function legacyJourney(){
 assert.equal(sql("SELECT to_regclass('private.transaction_attachment_lifecycle') IS NULL;"),'t');
 const path='conversations/44444444-4444-4444-8444-444444444444/'+a+'/legacy.pdf';
 const route=objectUrl(path);
 denied(await request(route,{method:'POST',as:'b',body:content,contentType:'application/pdf'}),'POST','b',route,'rls');
 denied(await request(route,{method:'POST',as:'c',body:content,contentType:'application/pdf'}),'POST','c',route,'rls');
 assert.equal(objectCount(path),'0','denied legacy uploads created object');
 expect(await request(route,{method:'POST',body:content,contentType:'application/pdf'}),'POST','a',route,200);
 assert.equal(sql("SELECT owner_id FROM storage.objects WHERE bucket_id='"+bucket+"' AND name='"+path+"';"),a);
 expect(await request(downloadUrl(path),{as:'b'}),'GET','b',downloadUrl(path),200);
 denied(await request(downloadUrl(path),{as:'c'}),'GET','c',downloadUrl(path),'hidden');
 await signedDownload(path,bucket,'b');
 expect(await request(route,{method:'POST',body:rewrite,upsert:true,contentType:'application/pdf'}),'POST','a',route,200);
 assert.deepEqual((await request(downloadUrl(path))).buffer,rewrite,'legacy owner upsert failed');
 expect(await request(route,{method:'PUT',body:content,contentType:'application/pdf'}),'PUT','a',route,200);
 assert.deepEqual((await request(downloadUrl(path))).buffer,content,'legacy owner update failed');
 expect(await request(route,{method:'DELETE'}),'DELETE','a',route,200);
 assert.equal(objectCount(path),'0','legacy owner delete failed');
 dependencyChecks();
 console.log('LEGACY_REPOSITORY_CONTRACT_PASS_NOT_STAGING_EQUIVALENCE');
}
async function postJourney(){
 const fake='conversations/44444444-4444-4444-8444-444444444444/'+a+'/00000000-0000-4000-8000-000000000000.pdf';
 denied(await request(objectUrl(fake),{method:'POST',body:content,contentType:'application/pdf'}),'POST','a',objectUrl(fake),'rls');
 assert.equal(objectCount(fake),'0');
 const prepared=JSON.parse(sql("SET ROLE service_role; SELECT public.prepare_transaction_attachment_uploads_internal('"+a+"'::uuid,'conversation','synthetic-storage-conversation',"+
 "'[{\"name\":\"synthetic.pdf\",\"type\":\"application/pdf\",\"size\":"+content.length+"}]'::jsonb)::text;")).items[0];
 assert.match(prepared.attachmentId,/^[0-9a-f-]{36}$/);
 assert.match(prepared.path,new RegExp('^conversations/44444444-4444-4444-8444-444444444444/'+a+'/[0-9a-f-]{36}\\.pdf$'));
 const path=prepared.path,route=objectUrl(path);
 for(const actor of ['b','c'])denied(await request(route,{method:'POST',as:actor,body:content,contentType:'application/pdf'}),'POST',actor,route,'rls');
 assert.equal(objectCount(path),'0');
 expect(await request(route,{method:'POST',body:content,contentType:'application/pdf'}),'POST','a',route,200);
 const invalid=expect(await request(downloadUrl(path),{as:'invalid'}),'GET','invalid',downloadUrl(path),400,'403','Unauthorized');
 assert.equal(invalid.data?.message,'Invalid Compact JWS','gateway must reject malformed JWT');
 assert.equal(sql("SELECT owner_id FROM storage.objects WHERE bucket_id='"+bucket+"' AND name='"+path+"';"),a,'owner_id must come from JWT');
 const confirmed=JSON.parse(sql("SET ROLE service_role; SELECT public.confirm_transaction_attachment_uploads_internal('"+a+"'::uuid,ARRAY['"+prepared.attachmentId+"'::uuid])::text;"));
 assert.equal(confirmed.items[0].status,'uploaded');
 for(const actor of ['a','b']){
  const res=expect(await request(downloadUrl(path),{as:actor}),'GET',actor,downloadUrl(path),200);
  assert.deepEqual(res.buffer,content);
 }
 denied(await request(downloadUrl(path),{as:'c'}),'GET','c',downloadUrl(path),'hidden');
 denied(await request(signUrl(path),{as:'c',method:'POST',body:{expiresIn:60}}),'POST','c',signUrl(path),'hidden');
 await signedDownload(path,bucket,'b');
 denied(await request(downloadUrl(path,'professional-verification-media')),'GET','a',downloadUrl(path,'professional-verification-media'),'hidden');
 denied(await request(route,{method:'POST',body:rewrite,contentType:'application/pdf',upsert:true}),'POST','a',route,'rls');
 denied(await request(route,{method:'PUT',body:rewrite,contentType:'application/pdf'}),'PUT','a',route,'rls');
 assert.deepEqual((await request(downloadUrl(path))).buffer,content,'unauthorized upsert changed bytes');
 denied(await request(route,{method:'DELETE'}),'DELETE','a',route,'rls');
 assert.equal(objectCount(path),'1');
 sql("SET ROLE service_role; SELECT public.attach_transaction_attachments_to_message_internal('"+a+"','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ARRAY['"+prepared.attachmentId+"'::uuid]);");
 const before=invariants();dependencyChecks(prepared);assert.equal(invariants(),before,'dependency assertions escaped rollback');
 // Real concurrent PATCH requests: exactly one removal commits; the replay is rejected by BEFORE UPDATE.
 const message='/messages?id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const outcomes=await Promise.all([1,2].map(()=>request(message,{api:'rest',method:'PATCH',body:{status:'removed',body:''}})));
 assert.equal(outcomes.filter(r=>r.status===200).length,1,'removal must commit once');
 for(const r of outcomes)if(r.status===200){
  expect(r,'PATCH','a','/messages',200);assert.equal(r.data.length,1);assert.equal(r.data[0].status,'removed');
 }else expect(r,'PATCH','a','/messages',403,'42501');
 assert.equal(sql("SELECT status FROM private.transaction_attachment_lifecycle WHERE id='"+prepared.attachmentId+"';"),'orphaned');
 assert.equal(sql("SELECT retain_until BETWEEN now()+interval '29 days' AND now()+interval '31 days' FROM private.transaction_attachment_lifecycle WHERE id='"+prepared.attachmentId+"';"),'t');
 expect(await request(route,{as:'service',method:'DELETE'}),'DELETE','service',route,200);
 denied(await request(downloadUrl(path)),'GET','a',downloadUrl(path),'hidden');
 assert.equal(objectCount(path),'0','service API cleanup left metadata');
 console.log('POST_MIGRATION_STORAGE_AND_TRIGGER_COOPERATION_PASS');
}
async function main(){
 const health=await fetch(url+'/storage/v1/status',{redirect:'error',signal:AbortSignal.timeout(8000)});
 assert.equal(health.status,200,'storage health');
 await buckets();await kyc();
 const before=invariants();
 const baselineFile=process.env.KONTRAT_STORAGE_BASELINE_FILE;
 if(baselineFile){
  assert.equal(path.resolve(baselineFile),path.join(path.dirname(path.resolve(process.env.KONTRAT_LOCAL_STATUS_FILE)),'dependency-fingerprint.json'),'REFUSE_UNOWNED_FINGERPRINT_PATH');
 }
 if(phase==='post'&&baselineFile)assert.equal(fs.readFileSync(baselineFile,'utf8'),before,'KYC/ANA drift across migration');
 if(phase==='legacy')await legacyJourney();else await postJourney();
 assert.equal(invariants(),before,'KYC/ANA contract changed');
 if(phase==='legacy'&&baselineFile)fs.writeFileSync(baselineFile,before,{flag:'wx'});
 console.log(phase==='legacy'?'MSG_A05_LEGACY_LOCAL_STORAGE_CONTRACT_PASS':'MSG_A05_REAL_LOCAL_STORAGE_API_SYNTHETIC_PASS_NO_HOSTED_DEPLOY');
}
main().catch(error=>{
 const failure=error.code==='ERR_ASSERTION'?error.message.split('\n')[0]:'transport/dependency execution failed';
 const marker=String(error.stderr||'').match(/(?:DOKE|REFUSE|A03|A05|KYC|IDENTITY|LEGACY|BEFORE_AFTER|PRIVATE|SPOOFED|ACCEPTED|READ_OR|RECIPIENT)_[A-Z_]+/)?.[0];
 console.error(JSON.stringify({result:'MSG_A05_REAL_LOCAL_STORAGE_API_SYNTHETIC_FAIL',phase,failure,marker:marker||null}));
 process.exitCode=1;
});
