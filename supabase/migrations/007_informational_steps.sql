-- ============================================================
-- Travel Wallet — Informational sub-task type + description field
-- ============================================================

-- Add 'informational' to valid sub-task types
alter table sub_tasks drop constraint if exists valid_type;
alter table sub_tasks add constraint valid_type
  check (type in ('automated', 'generatable', 'primary_action', 'third_party', 'informational'));

-- Store step description text (used by informational, generatable, portal, and upload steps)
alter table sub_tasks
  add column if not exists description text;
