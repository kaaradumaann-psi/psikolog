# PHASE-07 — Randevular + Görevler + Ayarlar + Yönetim + Denetim

**Durum:** DONE
**Tarih:** 2026-09-24
**Commit:** pending
**Build:** 693kB JS gzip 192kB
**Test:** 68 pass

## Migration: 20260924000005_phase07_appointments_tasks.sql
- `appointments` table: client_id nullable FK cascade, organization_id FK, title 1-180 btrim, description <=2000, start_at timestamptz, end_at timestamptz check end > start, status scheduled/completed/cancelled/no_show default scheduled, location <=200, created_by FK, indexes client start desc, org start desc, created_by, set_updated_at, audit trigger.
- `tasks` table: client_id nullable FK cascade, org FK, title 1-180, description <=2000, due_date date nullable, status todo/in_progress/done/cancelled default todo, priority low/medium/high default medium, assigned_to FK profiles set null, created_by FK, indexes client due asc, org due asc, assigned status, set_updated_at, audit trigger.
- RLS: appointments/tasks select is_admin or is_org_member, insert owner+active+org_member+role+(client null or exists client org match), update is_admin or org_member and (owner or org_admin or assigned_to=auth.uid() for tasks), delete is_admin or org_member and (owner or org_admin).
- Admin RPCs security definer is_admin check:
  - `admin_list_profiles()` returns setof profiles order created_at desc
  - `admin_update_profile(p_id uuid, p_role user_role, p_active boolean, p_org_id uuid)` updates role/active/org_id returning *
  - `admin_list_organizations()` returns setof organizations
  - `admin_create_organization(p_name text)` validates 2-180 btrim, insert returning *
  - revoke public/anon, grant authenticated execute
- log_audit_change() recreation: handles anamneses/sessions/assessments/test_administrations/test_results/reports/report_templates/documents/notes/appointments/tasks/psychologist_settings org extraction, action mapping document_insert etc appointment_insert task_insert etc.
- audit_logs_action_check extended to full list including document/note/appointment/task (same as PHASE-06 but ensured).

## Types/API/UI
- `appointmentTypes.ts`: Appointment/Row rowToAppointment.
- `appointmentApi.ts`: listAppointments limit 100 order start_at asc, listAppointmentsByClient, createAppointment org check client org, end > start validation, updateAppointment, deleteAppointment.
- `taskTypes.ts`: Task/Row rowToTask.
- `taskApi.ts`: listTasks, listTasksByClient, createTask org check, updateTask, deleteTask.
- `adminApi.ts`: AdminProfile/AdminOrg types, adminListProfiles rpc admin_list_profiles, adminUpdateProfile rpc admin_update_profile, adminListOrganizations, adminCreateOrganization.
- `auditApi.ts`: AuditLog type, listAuditLogs limit 100 order created_at desc, listAuditLogsByClient filter target_id=clientId.
- `settingsApi.ts`: getPsychologistSettings select where created_by=userId maybeSingle else EMPTY_LETTERHEAD, upsertPsychologistSettings validates data URL logo/signature <=1MB and startsWith data:, upsert onConflict created_by.
- `AppointmentsPage.tsx`: list, showForm toggle, form title/description/startAt/endAt/location/status, create calls createAppointment, list cards with status badge, Tamamla toggle status, delete ConfirmDialog.
- `TasksPage.tsx`: similar, priority borderLeft high red, medium yellow, low border, İlerlet status cycle todo->in_progress->done->todo, delete.
- `Admin.tsx` full rewrite:
  - AdminPage: load profiles+orgs via RPC, new org input 180, create org, org list id slice 8, profiles table first_name last_name email role badge active org slice, Düzenle opens editing state role/active/org select, Kaydet calls adminUpdateProfile.
  - SettingsPage: letterhead state EMPTY_LETTERHEAD, load getPsychologistSettings, file to data URL FileReader 1MB check, logo/signature preview img 80x80 / 120x60 border, Temizle, Kaydet upsertPsychologistSettings.
  - AuditPage: listAuditLogs 100, display created_at locale, badge action, targetTable:targetId slice 8, actor/org slice 8.
- `router.ts` extended: AppRoute appointments/tasks, parseRoute /appointments /tasks /settings /admin /audit.
- `App.tsx` switch appointments/tasks pages.
- `Sidebar.tsx` links appointments/tasks under Çalışma.
- `Dashboard.tsx` updated stats 6 cards (Danışanlar, Randevular, Görevler, Raporlar, Belgeler PRIVATE, Güvenlik RLS), MVP akışı PHASE-07 DONE text, buttons to clients/new/appointments/tasks/settings/admin.
- `Clients.tsx` genel tab shows yakın randevular 3 and açık görevler count, geçmiş tab audit logs, belgeler/notlar already.

## Güvenlik
- Admin RPCs security definer checks is_admin() else raise Yetkisiz, prevents role escalation via direct table update (profiles update revoked).
- Appointments/tasks RLS tenant isolation org_id, client optional but if client_id set must belong to same org.
- Tasks assigned_to can update own assigned tasks (org_member and assigned_to=auth.uid()).
- Audit logs server-side trigger, client cannot insert (revoked), only ADMIN/ORG_ADMIN can read (RLS).
- Letterhead data URL validation 1MB, no public URL, stored in psychologist_settings RLS org_member.

## KVKK
- Minimal fields, no sensitive logging, letterhead data URL size limit.

## Test
- securityExtended.test.ts covers appointments/tasks IDOR: PSY_B cannot read ORG_A appointments/tasks, anon 0, storage bucket private, reports RLS.
- router.test.ts extended for appointments/tasks/settings/admin/audit.

## Sonraki
- PHASE-08 security/responsive audit + E2E.
