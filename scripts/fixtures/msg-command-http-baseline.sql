-- Disposable integration fixture, NOT a staging schema replica.
-- Messaging columns: backend/modules/messaging/messaging-service.js at fe74f69.
-- Ledger/audit contracts: migration 004_mvp_backend_security_foundation.sql.
-- Native auth.uid(), Auth and PostgREST are supplied by the local Supabase stack.
-- Policies below deliberately scope this fixture to participant messaging only.
BEGIN;
CREATE TABLE public.users (
 id uuid PRIMARY KEY REFERENCES auth.users(id), email text NOT NULL,
 role text NOT NULL CHECK (role IN ('client','professional')), status text DEFAULT 'active',
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL,
 client_id uuid NOT NULL REFERENCES public.users(id), professional_id uuid NOT NULL REFERENCES public.users(id),
 status text NOT NULL DEFAULT 'active', last_message_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.conversations(id),
 sender_id uuid NOT NULL REFERENCES public.users(id), body text NOT NULL,
 status text NOT NULL DEFAULT 'sent', created_at timestamptz DEFAULT now()
);
CREATE TABLE public.api_idempotency_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idempotency_key text UNIQUE NOT NULL,
 actor_id uuid REFERENCES public.users(id), action text NOT NULL, entity_type text NOT NULL, entity_id uuid,
 request_hash text NOT NULL, status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','succeeded','failed','expired')),
 response_body jsonb, expires_at timestamptz DEFAULT now()+interval '24 hours',
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.admin_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.users(id), actor_role text,
 action text NOT NULL, entity_type text NOT NULL, entity_id uuid,
 idempotency_key text REFERENCES public.api_idempotency_keys(idempotency_key),
 metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users, public.conversations, public.messages, public.api_idempotency_keys, public.admin_audit_events FROM anon, authenticated;
GRANT SELECT ON public.users, public.conversations, public.messages TO authenticated;
GRANT INSERT ON public.messages TO authenticated;
GRANT UPDATE(status) ON public.messages TO authenticated;
GRANT UPDATE(last_message_at) ON public.conversations TO authenticated;
GRANT ALL ON public.users, public.conversations, public.messages, public.api_idempotency_keys, public.admin_audit_events TO service_role;
CREATE POLICY self_read ON public.users FOR SELECT TO authenticated USING (id=auth.uid());
CREATE POLICY participant_read ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (client_id,professional_id));
CREATE POLICY participant_touch ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() IN (client_id,professional_id)) WITH CHECK (auth.uid() IN (client_id,professional_id));
CREATE POLICY participant_read ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id=conversation_id AND auth.uid() IN (c.client_id,c.professional_id)));
CREATE POLICY participant_send ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id=conversation_id AND auth.uid() IN (c.client_id,c.professional_id)));
-- markConversationRead at fe74f69: only incoming, non-removed participant messages.
-- Column grant prevents body, sender, conversation and identity changes.
CREATE POLICY participant_mark_read ON public.messages FOR UPDATE TO authenticated
USING (
 sender_id <> auth.uid() AND status <> 'removed'
 AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id=conversation_id AND auth.uid() IN (c.client_id,c.professional_id))
)
WITH CHECK (
 sender_id <> auth.uid() AND status = 'read'
 AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id=conversation_id AND auth.uid() IN (c.client_id,c.professional_id))
);
NOTIFY pgrst, 'reload schema';
COMMIT;
