-- Doke SCHED-A04: DST-safe local projection compatibility correction.
-- Repository-generated migration only. Do not apply without an exact, independent staging authorization.

begin;
set local search_path = pg_catalog, public, private, extensions;

-- UTC starts_at/ends_at are the canonical ordered range. During a fall-back
-- transition, a valid later instant can project to an equal or earlier local
-- wall-clock value, so local_start/local_end cannot carry an ordering check.
alter table public.schedule_reservations
  drop constraint if exists schedule_reservations_local_range;

comment on column public.schedule_reservations.local_start is
  'Audited local wall-clock projection resolved from starts_at and timezone; not an ordering authority.';
comment on column public.schedule_reservations.local_end is
  'Audited local wall-clock projection resolved from ends_at and timezone; may repeat or move backward across DST fall-back.';
comment on column public.schedule_reservations.resolved_offset_minutes is
  'UTC offset resolved for starts_at. The command runtime independently validates the local end projection.';

notify pgrst, 'reload schema';

commit;
