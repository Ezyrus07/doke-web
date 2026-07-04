-- Doke Sprint 16: executable policy negative cases with JWT role switching.
-- This test must run in a transaction so validation never persists mutations.

begin;

do $$
begin
  if not exists (
    select 1
    from public.payment_disputes
    where id = 'abababab-abab-4aba-8bab-abababababab'
      and status = 'under_review'
  ) then
    raise exception 'Seed precondition failed: controlled dispute must be under_review.';
  end if;
end
$$;

-- Client must not read the admin audit queue.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.admin_audit_events) then
    raise exception 'RLS failure: client can read admin audit events.';
  end if;
end
$$;

reset role;

-- Professional must not resolve a dispute through support/admin policies.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;

do $$
declare
  denied boolean := false;
begin
  begin
    update public.payment_disputes
    set status = 'released', resolution = 'release_professional'
    where id = 'abababab-abab-4aba-8bab-abababababab';
  exception
    when insufficient_privilege then
      denied := true;
  end;

  if not denied then
    raise exception 'RLS failure: professional resolved a dispute through a privileged path.';
  end if;
end
$$;

reset role;

-- Support must be able to read the seeded operational queues.
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
begin
  if not exists (select 1 from public.payment_disputes) then
    raise exception 'RLS failure: support cannot read the seeded dispute queue.';
  end if;

  if not exists (select 1 from public.withdrawals) then
    raise exception 'RLS failure: support cannot read the seeded withdrawal queue.';
  end if;
end
$$;

reset role;
rollback;
