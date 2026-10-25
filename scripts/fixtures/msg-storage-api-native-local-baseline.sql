\set ON_ERROR_STOP on
-- This SQL is applied ONLY to a newly-created, unlinked, disposable Supabase
-- local stack; never to a hosted database or the user's actual local project.
DO $gate$
BEGIN
 IF current_database()<>'postgres'
   OR current_user<>'postgres'
   OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('orders','users','conversations','messages')) THEN
   RAISE EXCEPTION 'REFUSE_UNEXPECTED_LOCAL_FIXTURE_DATABASE';
 END IF;
END $gate$;
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated,service_role;
CREATE TABLE public.users(
 id uuid PRIMARY KEY,
 status text NOT NULL DEFAULT 'active',
 role text NOT NULL DEFAULT 'client'
);
CREATE TABLE public.orders(
 id uuid PRIMARY KEY,
 external_id text UNIQUE,
 client_id uuid NOT NULL REFERENCES public.users(id),
 professional_id uuid NOT NULL REFERENCES public.users(id)
);
CREATE TABLE public.conversations(
 id uuid PRIMARY KEY,
 external_id text UNIQUE,
 client_id uuid NOT NULL REFERENCES public.users(id),
 professional_id uuid NOT NULL REFERENCES public.users(id)
);
CREATE TABLE public.messages(
 id uuid PRIMARY KEY,
 conversation_id uuid NOT NULL REFERENCES public.conversations(id),
 sender_id uuid NOT NULL REFERENCES public.users(id),
 body text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','delivered','read','removed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 external_id text,
 message_type text NOT NULL DEFAULT 'text',
 attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 read_at timestamptz
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.users,public.orders,public.conversations,public.messages TO authenticated,service_role;
GRANT INSERT,UPDATE ON public.messages TO authenticated,service_role;
CREATE POLICY transaction_conversation_participant_read ON public.conversations FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) IN (client_id,professional_id));
CREATE POLICY transaction_message_participant_read ON public.messages FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=conversation_id
 AND (SELECT auth.uid()) IN (c.client_id,c.professional_id)));
CREATE POLICY transaction_message_participant_update ON public.messages FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=conversation_id
 AND (SELECT auth.uid()) IN (c.client_id,c.professional_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=conversation_id
 AND (SELECT auth.uid()) IN (c.client_id,c.professional_id)));
INSERT INTO public.users(id,status,role) VALUES
 ('11111111-1111-4111-8111-111111111111','active','client'),
 ('22222222-2222-4222-8222-222222222222','active','professional'),
 ('99999999-9999-4999-8999-999999999999','active','client');
INSERT INTO public.conversations(id,external_id,client_id,professional_id)
VALUES('44444444-4444-4444-8444-444444444444','synthetic-storage-conversation',
'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
INSERT INTO public.messages(id,conversation_id,sender_id,body,status)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'44444444-4444-4444-8444-444444444444',
'11111111-1111-4111-8111-111111111111','synthetic attachment','sent');
SELECT 'SYNTHETIC_SUPABASE_STORAGE_FIXTURE_READY';
