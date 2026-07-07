-- Persist per-package proposal customizations (quantity overrides + added
-- equipment) so a saved job reloads with the technician's edits intact.
alter table public.jobs add column if not exists proposal_edits jsonb;
