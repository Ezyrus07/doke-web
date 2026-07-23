begin;

revoke all privileges on table
  public.conversations,
  public.messages,
  public.orders
from anon;

revoke select on table public.order_status_history from anon;
revoke insert, update, delete on table
  public.service_quote_questions,
  public.service_quote_templates
from anon;

revoke delete on table
  public.conversations,
  public.messages
from authenticated;

revoke select on table
  public.quote_template_category_benchmarks,
  public.quote_template_conversion_metrics,
  public.quote_template_funnel_sessions,
  public.quote_template_question_dropoff,
  public.quote_template_smart_recommendations,
  public.service_metric_totals
from authenticated;

notify pgrst, 'reload schema';
commit;
