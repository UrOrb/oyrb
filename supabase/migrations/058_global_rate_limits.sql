-- 058 — Global server-side rate limiting
--
-- Replaces per-Lambda in-memory counters with a Postgres-backed atomic
-- counter. Route handlers call public.consume_rate_limit through the
-- service-role client in src/lib/rate-limit.ts. No public RLS policies are
-- exposed; this table is an implementation detail.

create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

create index if not exists idx_rate_limits_reset_at
  on public.rate_limits(reset_at);

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
returns table(ok boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := clock_timestamp();
  new_reset timestamptz := clock_timestamp() + make_interval(secs => greatest(p_window_ms, 1) / 1000.0);
  row_hits integer;
  row_reset timestamptz;
begin
  if p_key is null or length(p_key) = 0 then
    raise exception using errcode = '22023', message = 'rate limit key required';
  end if;
  if p_limit < 1 then
    raise exception using errcode = '22023', message = 'rate limit must be positive';
  end if;

  with consumed as (
    insert into public.rate_limits as rl (key, hits, reset_at)
    values (p_key, 1, new_reset)
    on conflict (key) do update
      set hits = case
            when rl.reset_at <= now_ts then 1
            else rl.hits + 1
          end,
          reset_at = case
            when rl.reset_at <= now_ts then new_reset
            else rl.reset_at
          end
    returning rl.hits as consumed_hits, rl.reset_at as consumed_reset_at
  )
  select consumed_hits, consumed_reset_at
    into row_hits, row_reset
  from consumed;

  ok := row_hits <= p_limit;
  remaining := greatest(p_limit - row_hits, 0);
  reset_at := row_reset;
  return next;
end;
$$;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Atomically consumes one hit from a global rate-limit bucket.';
