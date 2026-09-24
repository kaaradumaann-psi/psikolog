# PHASE-03 — Anamnez & Görüşmeler

**Durum:** DONE
**Tarih:** 2026-09-24
**Commit:** pending
**Build:** 653kB JS (gzip 185kB) — PHASE-02 607kB idi, +46kB yeni modüller
**Test:** 56 pass (clientValidation 8 + security 10 IDOR + diğer 37+)

## Yapılanlar

### Migration: 20260924000001_phase03_anamnesis_sessions.sql
- `anamneses` table: client_id FK cascade unique 1-1, org FK, reason/current_status/personal_history/family_history/social_life/relationships/previous_applications/previous_assessments/expert_notes <=5000, education/profession <=2000, created_by FK profiles, indexes client_id unique, org, set_updated_at trigger.
- `sessions` table: client_id FK cascade, org FK, date not future Istanbul via `validate_session_date()` trigger, type 1-80, duration 5-600, notes/observation <=8000, key_points/plan/follow_up <=5000, indexes client_date desc.
- `audit_logs` action check extended: anamnesis insert/update/delete, session insert/update/delete, assessment, test, report, template.
- `log_audit_change()` function extended: new tables org extraction (organization_id column or via clients join? actually direct org_id), handles anamneses/sessions.
- Triggers: anamneses_audit, sessions_audit.
- RLS: enable + policies select authenticated is_admin or is_org_member, insert check created_by=auth.uid() is_active_user is_org_member is_psychologist/org_admin/admin, update/delete is_admin or org_member and (owner or org_admin).
- revoke anon, grant authenticated.

### Types/API/UI
- `src/features/anamnesis/anamnesisTypes.ts`: Anamnesis/Row/Input, rowToAnamnesis.
- `src/features/anamnesis/anamnesisApi.ts`: getAnamnesisByClient (maybeSingle), upsertAnamnesis with org check client.organization_id == profile.org_id, upsert onConflict client_id.
- `src/features/anamnesis/AnamnesisForm.tsx`: RHF+zod max 5000/2000, load existing via useEffect reset, upsert, toast.
- `src/features/sessions/sessionTypes.ts`: Session/Row/Input, SESSION_TYPES const.
- `src/features/sessions/sessionApi.ts`: listSessionsByClient order date desc, createSession org check, updateSession partial, deleteSession.
- `src/features/sessions/SessionForm.tsx`: date isValidDateOnly+isFutureDateIstanbul, type, duration 5-600 integer, notes/observation/keyPoints/plan/followUp.
- `src/features/sessions/SessionList.tsx`: list, delete with ConfirmDialog, empty state.
- `ClientFilePage` tab integration: anamnez tab => AnamnesisForm, görüşmeler tab => SessionForm toggle + SessionList refreshKey.

### Güvenlik
- Anamnesis upsert: client org check prevents IDOR (different org client id => throw).
- Sessions create: same org check.
- RLS policies mirror clients pattern: select is_admin or is_org_member, insert owner check, update/delete owner or org_admin.
- Audit triggers ensure log.

### KVKK
- Minimal fields, 5000/2000 limits, no logging sensitive data.
- Anamnez 1-1 prevents duplicate.

### Responsive
- Form grid 1fr 1fr responsive via existing CSS, textarea full width.

## Sonraki
- PHASE-04 assessments/tests done same commit batch.
