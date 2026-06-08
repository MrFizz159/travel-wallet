-- ============================================================
-- Travel Wallet — Add authorisation_name to trip_transits
-- Stores the specific name of the required transit authorisation
-- (e.g. "eTA", "ESTA", "Transit visa") separately from the
-- generic visa_required boolean and the free-text transit_note.
-- ============================================================

alter table trip_transits
  add column if not exists authorisation_name text;
