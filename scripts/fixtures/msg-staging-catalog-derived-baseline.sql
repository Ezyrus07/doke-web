\set ON_ERROR_STOP on
-- Staging CATALOG-DERIVED metadata (2026-10-25), populated with SYNTHETIC records only.
-- All omitted external FKs and Storage helper logic must be checked separately.
DO $role$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $role$;
CREATE SCHEMA auth; CREATE SCHEMA private;
GRANT USAGE ON SCHEMA auth, private TO authenticated,service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public."users" (
 "id" uuid NOT NULL,
 "email" text,
 "phone" text,
 "role" text NOT NULL DEFAULT 'client'::text,
 "status" text NOT NULL DEFAULT 'active'::text,
 "created_at" timestamp with time zone NOT NULL DEFAULT now(),
 "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
 "onboarding_status" text NOT NULL DEFAULT 'not_started'::text,
 "onboarding_completed_at" timestamp with time zone,
 "settings" jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public."orders" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "client_id" uuid NOT NULL,
 "professional_id" uuid,
 "service_id" uuid,
 "title" text NOT NULL,
 "description" text,
 "status" text NOT NULL DEFAULT 'requested'::text,
 "city" text,
 "state" text,
 "scheduled_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL DEFAULT now(),
 "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
 "external_id" text,
 "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "service_version_id" uuid,
 "service_snapshot" jsonb,
 "schedule_reservation_id" uuid
);
CREATE TABLE public."conversations" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "order_id" uuid,
 "client_id" uuid NOT NULL,
 "professional_id" uuid NOT NULL,
 "status" text NOT NULL DEFAULT 'active'::text,
 "last_message_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL DEFAULT now(),
 "external_id" text,
 "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public."messages" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "conversation_id" uuid NOT NULL,
 "sender_id" uuid NOT NULL,
 "body" text,
 "status" text NOT NULL DEFAULT 'sent'::text,
 "created_at" timestamp with time zone NOT NULL DEFAULT now(),
 "external_id" text,
 "message_type" text NOT NULL DEFAULT 'text'::text,
 "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "read_at" timestamp with time zone
);
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_pkey" PRIMARY KEY (id);
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_status_check" CHECK (status = ANY (ARRAY['active'::text, 'archived'::text, 'blocked'::text]));
ALTER TABLE public."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id);
ALTER TABLE public."messages" ADD CONSTRAINT "messages_status_check" CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'removed'::text]));
ALTER TABLE public."orders" ADD CONSTRAINT "orders_pkey" PRIMARY KEY (id);
ALTER TABLE public."orders" ADD CONSTRAINT "orders_service_snapshot_projection_check" CHECK (status = 'draft'::text OR (metadata -> 'serviceSnapshot'::text) = service_snapshot AND (metadata ->> 'serviceVersionId'::text) = service_version_id::text AND (metadata ->> 'serviceSnapshotAuthority'::text) = 'approved_service_version'::text);
ALTER TABLE public."orders" ADD CONSTRAINT "orders_service_snapshot_required_check" CHECK (status = 'draft'::text OR service_id IS NOT NULL AND service_version_id IS NOT NULL AND jsonb_typeof(service_snapshot) = 'object'::text);
ALTER TABLE public."orders" ADD CONSTRAINT "orders_service_snapshot_shape_check" CHECK (service_snapshot IS NULL OR jsonb_typeof(service_snapshot) = 'object'::text);
ALTER TABLE public."orders" ADD CONSTRAINT "orders_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'requested'::text, 'quoted'::text, 'accepted'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text]));
ALTER TABLE public."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
ALTER TABLE public."users" ADD CONSTRAINT "users_onboarding_status_check" CHECK (onboarding_status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text]));
ALTER TABLE public."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE public."users" ADD CONSTRAINT "users_role_check" CHECK (role = ANY (ARRAY['client'::text, 'professional'::text, 'moderator'::text, 'support'::text, 'admin'::text]));
ALTER TABLE public."users" ADD CONSTRAINT "users_status_check" CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'suspended'::text, 'banned'::text, 'deleted'::text]));
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE public."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."orders" ADD CONSTRAINT "orders_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.users,public.orders,public.conversations,public.messages TO authenticated;
GRANT INSERT,UPDATE ON public.conversations,public.messages TO authenticated;
GRANT ALL ON public.users,public.orders,public.conversations,public.messages TO service_role;
CREATE POLICY "conversation_participants_insert" ON "public"."conversations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = professional_id)));
CREATE POLICY "conversation_participants_select" ON "public"."conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = professional_id)));
CREATE POLICY "conversation_participants_update" ON "public"."conversations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = professional_id))) WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = professional_id)));
CREATE POLICY "message_participants_select" ON "public"."messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM conversations conversation
  WHERE ((conversation.id = messages.conversation_id) AND ((( SELECT auth.uid() AS uid) = conversation.client_id) OR (( SELECT auth.uid() AS uid) = conversation.professional_id))))));
CREATE POLICY "message_participants_update" ON "public"."messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM conversations conversation
  WHERE ((conversation.id = messages.conversation_id) AND ((( SELECT auth.uid() AS uid) = conversation.client_id) OR (( SELECT auth.uid() AS uid) = conversation.professional_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM conversations conversation
  WHERE ((conversation.id = messages.conversation_id) AND ((( SELECT auth.uid() AS uid) = conversation.client_id) OR (( SELECT auth.uid() AS uid) = conversation.professional_id))))));
CREATE POLICY "message_sender_insert" ON "public"."messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM conversations conversation
  WHERE ((conversation.id = messages.conversation_id) AND ((( SELECT auth.uid() AS uid) = conversation.client_id) OR (( SELECT auth.uid() AS uid) = conversation.professional_id)))))));
CREATE POLICY "orders_participants_select" ON "public"."orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = professional_id)));
CREATE POLICY "users_select_own_account" ON "public"."users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = id));
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO authenticated,service_role;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text NOT NULL, name text NOT NULL, owner_id text, UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,service_role;
CREATE FUNCTION storage.foldername(p text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(p, '/') $$;
-- Catalog helper body is deliberately NOT copied: older policies will be replaced by MSG-A05.
CREATE FUNCTION private.can_access_transaction_attachment(p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT false $$;
GRANT EXECUTE ON FUNCTION private.can_access_transaction_attachment(text) TO authenticated;
CREATE POLICY "transaction_attachments_owner_delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'transaction-attachments'::text) AND (owner_id = (( SELECT auth.uid() AS uid))::text) AND private.can_access_transaction_attachment(name) AND ((storage.foldername(name))[3] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "transaction_attachments_owner_update" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'transaction-attachments'::text) AND (owner_id = (( SELECT auth.uid() AS uid))::text) AND private.can_access_transaction_attachment(name) AND ((storage.foldername(name))[3] = (( SELECT auth.uid() AS uid))::text))) WITH CHECK (((bucket_id = 'transaction-attachments'::text) AND (owner_id = (( SELECT auth.uid() AS uid))::text) AND private.can_access_transaction_attachment(name) AND ((storage.foldername(name))[3] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "transaction_attachments_participant_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'transaction-attachments'::text) AND private.can_access_transaction_attachment(name) AND ((storage.foldername(name))[3] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "transaction_attachments_participant_select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'transaction-attachments'::text) AND private.can_access_transaction_attachment(name)));
INSERT INTO public.users(id,role,status) VALUES ('11111111-1111-4111-8111-111111111111','client','active'),('22222222-2222-4222-8222-222222222222','professional','active'),('99999999-9999-4999-8999-999999999999','client','active');
INSERT INTO public.orders(id,client_id,professional_id,title,status,external_id) VALUES ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Synthetic order','draft','synthetic-order');
INSERT INTO public.conversations(id,client_id,professional_id,status,external_id) VALUES ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','active','synthetic-conversation'),('55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999','22222222-2222-4222-8222-222222222222','active','synthetic-other-conversation');
INSERT INTO public.messages(id,conversation_id,sender_id,body,status) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','synthetic-a','sent'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','synthetic-b','sent'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999','synthetic-c','delivered'),('dddddddd-dddd-4ddd-8ddd-dddddddddddd','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','','removed');
SELECT 'STAGING_CATALOG_DERIVED_BASELINE_READY';
