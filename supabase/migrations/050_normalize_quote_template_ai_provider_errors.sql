begin;

update public.quote_template_ai_runs
set error_code = case
  when error_code is null then null
  when error_code in (
    'OPENAI_KEY_NOT_CONFIGURED',
    'OPENAI_BILLING_QUOTA',
    'OPENAI_RATE_LIMIT',
    'OPENAI_AUTH_INVALID',
    'OPENAI_ACCESS_DENIED',
    'OPENAI_REQUEST_INVALID',
    'OPENAI_TIMEOUT',
    'OPENAI_UNAVAILABLE',
    'OPENAI_EMPTY_OUTPUT',
    'OPENAI_INVALID_OUTPUT',
    'OPENAI_NO_VALID_SUGGESTIONS',
    'OPENAI_FAILED'
  ) then error_code
  when lower(error_code) similar to '%(insufficient_quota|billing|quota|credit)%' then 'OPENAI_BILLING_QUOTA'
  when lower(error_code) similar to '%(rate limit|too many requests)%' then 'OPENAI_RATE_LIMIT'
  when lower(error_code) similar to '%(timeout|timed out)%' then 'OPENAI_TIMEOUT'
  else 'OPENAI_FAILED'
end
where error_code is not null;

alter table public.quote_template_ai_runs
  drop constraint if exists quote_template_ai_runs_error_code_check;

alter table public.quote_template_ai_runs
  add constraint quote_template_ai_runs_error_code_check
  check (
    error_code is null
    or error_code = any (array[
      'OPENAI_KEY_NOT_CONFIGURED'::text,
      'OPENAI_BILLING_QUOTA'::text,
      'OPENAI_RATE_LIMIT'::text,
      'OPENAI_AUTH_INVALID'::text,
      'OPENAI_ACCESS_DENIED'::text,
      'OPENAI_REQUEST_INVALID'::text,
      'OPENAI_TIMEOUT'::text,
      'OPENAI_UNAVAILABLE'::text,
      'OPENAI_EMPTY_OUTPUT'::text,
      'OPENAI_INVALID_OUTPUT'::text,
      'OPENAI_NO_VALID_SUGGESTIONS'::text,
      'OPENAI_FAILED'::text
    ])
  );

comment on column public.quote_template_ai_runs.error_code is
  'Stable internal fallback code only. Raw provider error messages must never be persisted.';

commit;
