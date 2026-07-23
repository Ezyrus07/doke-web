begin;

revoke truncate, trigger, references on table
  public.conversations,
  public.messages,
  public.order_status_history,
  public.orders,
  public.professional_identity_verifications,
  public.professional_profiles,
  public.professional_quote_templates,
  public.quote_template_ai_runs,
  public.quote_template_application_events,
  public.quote_template_category_benchmarks,
  public.quote_template_conversion_metrics,
  public.quote_template_funnel_events,
  public.quote_template_funnel_sessions,
  public.quote_template_question_dropoff,
  public.quote_template_smart_recommendations,
  public.service_media,
  public.service_metric_events,
  public.service_metric_totals,
  public.service_moderation_events,
  public.service_quote_questions,
  public.service_quote_templates,
  public.service_versions,
  public.services,
  public.user_profiles,
  public.users,
  public.verification_events
from anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
