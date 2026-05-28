-- ============================================================
-- Travel Wallet — Manager approval requirement
-- ============================================================

-- Approval state on requirements (nullable — only used for manager_approval type)
alter table requirements
  add column if not exists approval_state text,
  add column if not exists approver_name text,
  add column if not exists approval_log jsonb not null default '[]'::jsonb;

alter table requirements
  add constraint valid_approval_state
    check (approval_state is null or approval_state in ('unsent', 'pending', 'approved', 'not_approved'));
