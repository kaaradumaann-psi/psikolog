-- Production audit: the original 'one live row per client' unique indexes
-- run BEFORE the AFTER INSERT superseding trigger. They reject every real
-- formulation/safety amendment with 23505. Keep one root per file and one
-- immediate successor per parent instead; no records are deleted or rewritten.
--
-- A composite, NOT VALID FK rejects NEW cross-file amendments (including
-- admin-created rows) without erasing or silently validating historical data.
-- Existing FK/lock triggers and RLS policies remain in place, unchanged.

drop index if exists public.formulations_live_client_idx;
create unique index formulations_root_client_idx on public.formulations (client_id)
  where amendment_of is null;
create unique index formulations_one_successor_idx on public.formulations (amendment_of)
  where amendment_of is not null;

drop index if exists public.safety_plans_live_client_idx;
create unique index safety_plans_root_client_idx on public.safety_plans (client_id)
  where amendment_of is null;
create unique index safety_plans_one_successor_idx on public.safety_plans (amendment_of)
  where amendment_of is not null;

-- PK alone cannot support the multi-column FK in PostgreSQL. These redundant
-- UNIQUE constraints intentionally make the client/org scope part of the key.
alter table public.formulations
  add constraint formulations_amendment_scope_key unique (id, client_id, organization_id);
alter table public.formulations
  add constraint formulations_amendment_scope_fk
  foreign key (amendment_of, client_id, organization_id)
  references public.formulations (id, client_id, organization_id) not valid;

alter table public.safety_plans
  add constraint safety_plans_amendment_scope_key unique (id, client_id, organization_id);
alter table public.safety_plans
  add constraint safety_plans_amendment_scope_fk
  foreign key (amendment_of, client_id, organization_id)
  references public.safety_plans (id, client_id, organization_id) not valid;

alter table public.sessions
  add constraint sessions_amendment_scope_key unique (id, client_id, organization_id);
alter table public.sessions
  add constraint sessions_amendment_scope_fk
  foreign key (amendment_of, client_id, organization_id)
  references public.sessions (id, client_id, organization_id) not valid;

alter table public.reports
  add constraint reports_amendment_scope_key unique (id, client_id, organization_id);
alter table public.reports
  add constraint reports_amendment_scope_fk
  foreign key (amendment_of, client_id, organization_id)
  references public.reports (id, client_id, organization_id) not valid;
