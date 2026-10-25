\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
do $test$
begin
 if has_table_privilege('authenticated','public.messages','UPDATE') then
   raise exception 'TABLE_LEVEL_UPDATE_REMAINED';
 end if;
 if has_column_privilege('authenticated','public.messages','sender_id','UPDATE') or
    has_column_privilege('authenticated','public.messages','conversation_id','UPDATE') or
    has_column_privilege('authenticated','public.messages','id','UPDATE') or
    has_column_privilege('authenticated','public.messages','read_at','UPDATE') or
    has_column_privilege('authenticated','public.messages','metadata','UPDATE') then
    raise exception 'IMMUTABLE_MESSAGE_COLUMN_WRITABLE';
 end if;
 if not has_column_privilege('authenticated','public.messages','status','UPDATE') or
    not has_column_privilege('authenticated','public.messages','body','UPDATE') then
   raise exception 'LEGITIMATE_MESSAGE_COLUMNS_UNAVAILABLE';
 end if;
 if not has_column_privilege('service_role','public.messages','sender_id','UPDATE') then
   raise exception 'SERVER_ROLE_LOST_MESSAGE_MUTATION';
 end if;
end $test$;
select 'AUTHENTICATED_COLUMN_GRANTS_RESTRICTED';
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
set role authenticated;
-- Recipient B reads message sent by A.
update public.messages set status='read' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $test$ begin
 if not exists (select 1 from public.messages where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status='read') then
   raise exception 'RECIPIENT_READ_FAILED';
 end if;
end $test$;
select 'RECIPIENT_READ_PASS';
-- Cannot remove another person's message.
do $test$
declare blocked boolean:=false;
begin
 begin
  update public.messages set status='removed',body='' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 exception when insufficient_privilege then blocked:=true;
 end;
 if not blocked then raise exception 'RECIPIENT_COULD_REMOVE_SENDER_MESSAGE'; end if;
end $test$;
select 'RECIPIENT_REMOVE_DENIED';
-- Cannot rewrite ownership, conversation or timestamps.
do $test$
declare blocked boolean:=false;
begin
 begin
  update public.messages set sender_id='11111111-1111-4111-8111-111111111111' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 exception when insufficient_privilege then blocked:=true;
 end;
 if not blocked then raise exception 'SENDER_UPDATE_ALLOWED'; end if;
end $test$;
select 'SENDER_COLUMN_UPDATE_DENIED';
-- Sender cannot directly rewrite text or mark their own message read.
do $test$
declare rejected boolean:=false;
begin
 begin
  update public.messages set body='tampered' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 exception when insufficient_privilege then rejected:=true;
 end;
 if not rejected then raise exception 'ARBITRARY_BODY_EDIT_ALLOWED'; end if;
 rejected:=false;
 begin
  update public.messages set status='read' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 exception when insufficient_privilege then rejected:=true;
 end;
 if not rejected then raise exception 'SENDER_SELF_READ_ALLOWED'; end if;
end $test$;
select 'SENDER_SELF_READ_AND_BODY_EDIT_DENIED';
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
set role authenticated;
-- Sender A legitimately removes own read message.
update public.messages set status='removed',body='' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $test$ begin
 if not exists(select 1 from public.messages where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status='removed' and body='') then
   raise exception 'SENDER_REMOVE_FAILED';
 end if;
end $test$;
select 'SENDER_REMOVE_PASS';
reset role;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
set role authenticated;
-- Recipient cannot resurrect removed message.
do $test$ declare rejected boolean:=false;
begin
 begin
  update public.messages set status='read' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 exception when insufficient_privilege then rejected:=true;
 end;
 if not rejected then raise exception 'REMOVED_MESSAGE_RESURRECTED'; end if;
end $test$;
select 'REMOVED_MESSAGE_STAYS_REMOVED';
-- B may mark C's message in their other shared conversation read.
update public.messages set status='read' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
update public.messages set status='read' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select 'RECIPIENT_READ_IDEMPOTENT';
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
set role authenticated;
-- A cannot update messages in a conversation only B and C participate in.
do $test$ declare changed integer;
begin
 update public.messages set status='read' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'NONPARTICIPANT_UPDATED_MESSAGE'; end if;
end $test$;
select 'NONPARTICIPANT_BLOCKED_BY_RLS';
reset role;
set role service_role;
update public.messages set status='delivered',body='server-controlled'
 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
reset role;
do $test$ begin
 if not exists(select 1 from public.messages where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
 and status='delivered' and body='server-controlled') then
   raise exception 'SERVICE_ROLE_UPDATE_REGRESSED';
 end if;
end $test$;
select 'SERVICE_ROLE_INTERNAL_UPDATE_PASS';
select 'MSG_UPDATE_AUTHORITY_PG17_SYNTHETIC_PASS';
