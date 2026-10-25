#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Verifies actual Supabase Storage REST endpoints, never hosted Supabase.
assert.equal(process.env.KONTRAT_ISOLATED_STORAGE_TEST,'true');
const info=JSON.parse(fs.readFileSync(process.env.KONTRAT_LOCAL_STATUS_FILE,'utf8'));
const url=info.API_URL;
const db=info.DB_URL;
const anonKey=info.ANON_KEY;
const serviceKey=info.SERVICE_ROLE_KEY;
const secret=info.JWT_SECRET;
assert.match(url,/^http:\/\/127\.0\.0\.1:54321$/);
assert.match(db,/^postgres(?:ql)?:\/\/postgres:[^@]+@127\.0\.0\.1:54322\/postgres$/);
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
const tokens={a:jwt(a),b:jwt(b),c:jwt(c)};
const validStatus=res=>res.status>=200&&res.status<300;
const denyStatus=res=>res.status>=400&&res.status<500;
async function request(path,{method='GET',as='a',body,upsert=false,contentType}={}){
 const headers={'apikey':anonKey,'Authorization':'Bearer '+(as==='service'?serviceKey:as==='anon'?anonKey:tokens[as])};
 if(upsert)headers['x-upsert']='true';
 if(contentType)headers['content-type']=contentType;
 if(body!==undefined&&!contentType)headers['content-type']='application/json';
 const resp=await fetch(url+'/storage/v1'+path,{
  method,headers,body:body===undefined?undefined:(typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)),
  signal:AbortSignal.timeout(15000)
 });
 const buffer=Buffer.from(await resp.arrayBuffer());
 const text=buffer.toString('utf8');
 let data;try{data=JSON.parse(text)}catch{data=text};
 return {status:resp.status,data,buffer};
}
function sql(query){
 const output=execFileSync('psql',['-X','-w','-q','-v','ON_ERROR_STOP=1','-A','-t','-d',db,'-c',query],
  {encoding:'utf8',timeout:12000});
 return output.trim();
}
function check(condition,label,response){
 if(!condition)throw Error(label+' HTTP '+response.status+' '+JSON.stringify(response.data).slice(0,250));
}
function objectUrl(path){return '/object/'+bucket+'/'+path.split('/').map(encodeURIComponent).join('/');}
function downloadUrl(path){return '/object/authenticated/'+bucket+'/'+path.split('/').map(encodeURIComponent).join('/');}
async function main(){
 const health=await fetch(url+'/storage/v1/status',{signal:AbortSignal.timeout(8000)});
 assert.equal(health.status,200,'storage health');
 console.log('STORAGE_API_REAL_GATEWAY_READY');

 const created=await request('/bucket',{method:'POST',as:'service',
 body:{id:bucket,name:bucket,public:false,file_size_limit:10485760,allowed_mime_types:['application/pdf']}});
 check(validStatus(created),'service creates test bucket',created);
 console.log('STORAGE_PRIVATE_BUCKET_CREATED');

 const content=Buffer.from('%PDF-1.4\n% synthetic Kontrat integration\n%%EOF\n');
 const fake='conversations/44444444-4444-4444-8444-444444444444/'+a+'/00000000-0000-4000-8000-000000000000.pdf';
 const rejectedNoIntent=await request(objectUrl(fake),{method:'POST',body:content,contentType:'application/pdf'});
 check(denyStatus(rejectedNoIntent),'unregistered upload is denied',rejectedNoIntent);
 console.log('STORAGE_UPLOAD_UNREGISTERED_PATH_DENIED');

 const prepare=sql("SELECT public.prepare_transaction_attachment_uploads_internal('"+a+"'::uuid,'conversation','synthetic-storage-conversation',"+
   "'[{\"name\":\"synthetic.pdf\",\"type\":\"application/pdf\",\"size\":"+content.length+"}]'::jsonb)::text;");
 const item=JSON.parse(prepare).items[0];
 assert.ok(item.attachmentId&&item.path);
 assert.match(item.path,/^conversations\//);
 const path=item.path;
 const route=objectUrl(path);
 const beforeB=await request(route,{method:'POST',as:'b',body:content,contentType:'application/pdf'});
 check(denyStatus(beforeB),'other participant cannot upload owner path',beforeB);
 const beforeC=await request(route,{method:'POST',as:'c',body:content,contentType:'application/pdf'});
 check(denyStatus(beforeC),'outsider cannot upload owner path',beforeC);
 console.log('STORAGE_UPLOAD_ACTOR_SPOOF_DENIED');

 const upload=await request(route,{method:'POST',as:'a',body:content,contentType:'application/pdf'});
 check(validStatus(upload),'owner fresh upload',upload);
 console.log('STORAGE_OWNER_NEW_UPLOAD_SUCCEEDED');

 const verifiedOwner=sql("SELECT owner_id FROM storage.objects WHERE bucket_id='"+bucket+"' AND name='"+path+"';");
 assert.equal(verifiedOwner,a,'Storage wrote owner_id from JWT');
 const confirmed=sql("SELECT public.confirm_transaction_attachment_uploads_internal('"+a+"'::uuid,ARRAY['"+item.attachmentId+"'::uuid])::text;");
 assert.equal(JSON.parse(confirmed).items[0].status,'uploaded');
 console.log('STORAGE_UPLOAD_CONFIRMED_SERVER_SIDE');

 const read=await request(downloadUrl(path),{as:'a'});
 check(validStatus(read),'owner downloads file',read);
 assert.deepEqual(read.buffer,content);
 const participant=await request(downloadUrl(path),{as:'b'});
 check(validStatus(participant),'conversation participant downloads',participant);
 assert.deepEqual(participant.buffer,content);
 const forbiddenRead=await request(downloadUrl(path),{as:'c'});
 check(denyStatus(forbiddenRead),'nonparticipant download denied',forbiddenRead);
 console.log('STORAGE_DOWNLOAD_PARTICIPANTS_ONLY');

 const forbiddenSign=await request('/object/sign/'+bucket+'/'+path,{as:'c',method:'POST',body:{expiresIn:60}});
 check(denyStatus(forbiddenSign),'nonparticipant signed URL denied',forbiddenSign);
 const sign=await request('/object/sign/'+bucket+'/'+path,{as:'b',method:'POST',body:{expiresIn:60}});
 check(validStatus(sign),'participant signed URL granted',sign);
 assert.ok(sign.data.signedURL||sign.data.signedUrl||sign.data.signed_url,'signedURL missing');
 console.log('STORAGE_SIGNED_URL_PARTICIPANT_ONLY');

 const rewrite=Buffer.from('%PDF-1.4\n% BAD OVERWRITE\n%%EOF\n');
 const upsert=await request(route,{as:'a',method:'POST',body:rewrite,contentType:'application/pdf',upsert:true});
 check(denyStatus(upsert),'upsert forbidden without UPDATE policy',upsert);
 const existing=await request(downloadUrl(path),{as:'a'});
 check(validStatus(existing),'original file still downloadable',existing);
 assert.deepEqual(existing.buffer,content,'unauthorized upsert changed bytes');
 console.log('STORAGE_UPSERT_DENIED_ORIGINAL_BYTES_PRESERVED');

 const deleteOwner=await request(route,{as:'a',method:'DELETE'});
 check(denyStatus(deleteOwner),'direct owner delete forbidden',deleteOwner);
 const stillThere=await request(downloadUrl(path),{as:'a'});
 check(validStatus(stillThere),'file remains after denied deletion',stillThere);
 console.log('STORAGE_DIRECT_CLIENT_DELETE_DENIED');

 const deleted=await request(route,{as:'service',method:'DELETE'});
 check(validStatus(deleted),'service role Storage API cleanup',deleted);
 console.log('STORAGE_SERVICE_ROLE_API_DELETE_SUCCEEDED');

 const missing=await request(downloadUrl(path),{as:'a'});
 assert.ok(missing.status===400||missing.status===404,'removed object unavailable must return 400 or 404; got '+missing.status);
 assert.equal(sql("SELECT count(*) FROM storage.objects WHERE bucket_id='"+bucket+"' AND name='"+path+"';"),'0','Storage database still contains object metadata after API deletion');
 console.log('STORAGE_OBJECT_NO_LONGER_AVAILABLE');

 console.log('MSG_A05_REAL_LOCAL_STORAGE_API_SYNTHETIC_PASS_NO_HOSTED_DEPLOY');
}
main().catch(e=>{console.error('MSG_A05_REAL_LOCAL_STORAGE_API_SYNTHETIC_FAIL',e?.message||e);process.exitCode=1;});
