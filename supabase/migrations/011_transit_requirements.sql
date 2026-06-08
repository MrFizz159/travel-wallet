-- ============================================================
-- Migration 011: Transit requirement promotion
-- Travel Wallet PoC
-- ============================================================

-- 1. Add transit_id FK to requirements (nullable — only set for transit-sourced rows).
--    on delete cascade: removing a transit row removes its linked requirement.
alter table requirements
  add column if not exists transit_id uuid references trip_transits(id) on delete cascade;

create index if not exists requirements_transit_id_idx on requirements(transit_id);

-- 2. Add time_required_days to trip_transits so the processing time from the
--    pre-activation transit check is persisted and available at activation time
--    to compute latest_start_date on the linked requirement.
alter table trip_transits
  add column if not exists time_required_days integer not null default 0;
