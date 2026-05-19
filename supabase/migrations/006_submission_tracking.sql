-- ============================================================
-- Travel Wallet — Application submission tracking
-- ============================================================

-- Expand sub_tasks status to allow 'submitted' (portal application marked by user)
alter table sub_tasks drop constraint if exists valid_status;
alter table sub_tasks add constraint valid_status
  check (status in ('pending', 'complete', 'case_in_progress', 'submitted'));

-- Track when the user marked their application as submitted
alter table sub_tasks
  add column if not exists submitted_at timestamptz;
