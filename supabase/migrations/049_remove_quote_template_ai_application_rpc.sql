-- Remove the interrupted client-callable write path.
-- Selective application is audited only by the authenticated quote-template-ai Edge Function.

drop function if exists public.record_quote_template_ai_application(uuid, jsonb, text);
