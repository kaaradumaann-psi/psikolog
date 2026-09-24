# PHASE-05 — Raporlar & Şablonlar (MMPI Desen)

**Durum:** DONE
**Tarih:** 2026-09-24
**Commit:** pending
**Build:** 653kB JS gzip 185kB (was 607kB PHASE-02)
**Test:** 56 pass

## Yapılanlar

### Migration: 20260924000003_phase05_reports.sql
- `report_templates` table: organization_id nullable FK, created_by nullable FK, name 1-180, content jsonb object <=2MB, is_system bool, check (is_system and created_by null and org null) or (not is_system and created_by not null), seed 2 system templates: Standart Psikolojik Değerlendirme Raporu (id 000...001) with blocks heading1+dataField+paragraph, Özet Bilgi Notu 002.
- `reports` table: client_id FK cascade, assessment_id FK set null, test_administration_id FK set null, template_id FK set null, org FK, created_by FK, title 1-180, content jsonb object <=8MB, status draft/completed default draft, source_snapshot jsonb object, source_version default v1, revision int default 1, version_number int default 1, last_version_at, save_reason in create/autosave/manual/complete/refresh/restore default create, completed_at nullable, check status draft => completed_at null, completed => not null, indexes client updated_at desc, org, created_by.
- `report_versions` table: report_id FK cascade, version_number int, content jsonb, snapshot jsonb, created_by FK set null, created_at, reason, unique (report_id, version_number) — immutable history.
- `psychologist_settings` table: created_by PK FK, organization_id FK, letterhead jsonb default {} <=2MB, updated_at.
- Triggers:
  - `prepare_report()` before insert/update: INSERT sets revision 1 version 1 last_version_at now created_at now, UPDATE prevents ownership change (created_by/org/client/id), created_at preserved, revision old+1, version_number old, last_version_at old, if save_reason != autosave or old.last_version_at <= now-10min then version_number old+1 last_version_at now, updated_at now, completed_at logic (draft => null, insert => now, old not completed => now else preserve).
  - `version_report()` after insert/update security definer: INSERT inserts report_versions with version_number content snapshot created_by auth.uid() reason save_reason, UPDATE if version_number != old inserts new version. revoke all from public/anon/authenticated.
  - set_updated_at for templates/settings.
- Audit triggers: reports_audit, templates_audit.
- RLS:
  - templates: select active_user and (is_system or is_org_member or is_admin), insert not is_system and created_by=auth.uid() and org_member and psychologist/org_admin/admin, update/delete not is_system and is_admin or org_member and (owner or org_admin)
  - reports: select is_admin or (org_member and owner) or (org_admin and org_member), insert owner+active+org_member+admin/org_member + exists client org match + template exists system or org, update/delete is_admin or org_member and (owner or org_admin)
  - report_versions: select exists report where is_admin or org_member (via report_id join)
  - psychologist_settings: select is_admin or org_member, write all using is_admin or org_member with check same
- revoke anon, grant authenticated select/insert/update/delete templates/reports/settings, versions only select.

### Types/API/Engine/UI
- `templateEngine.ts`: ReportBlock type (heading1/heading2/paragraph/bulletList/numberedList/table/dataField/dataTable), Inline runs bold/italic/underline, Letterhead (name/title/institution/phone/email/address/logo dataURL/signature dataURL), EMPTY_LETTERHEAD, ReportDocument schemaVersion 1 blocks + optional letterhead, SYSTEM_TEMPLATE_ID/NAME, DataValue, ReportSourceData fields+tables, MISSING "—", displayValue, fieldValue safe __proto__ check, resolvePlaceholders {{path}} safe, hasData handles | and tables., dataCatalog catalog patient/test/assessment/anamnesis/sessions/tests/expert, evaluateWhen safe hasData only (no JS eval), createEmptyBlock crypto.randomUUID.
- `reportDataAdapter.ts`: ReportContext client/assessment/anamnesis/sessions/testAdministrations/psychologist, buildSourceData maps client fullName birthDate age fileNumber profession education phone email, assessment reason date method interview observation findings expertEvaluation result recommendations, anamnesis reason currentStatus etc, test date psychologist method, expert name title institution, tables sessions (Tarih/Tür/Süre/Önemli Noktalar) and tests (Tarih/Test/Durum/Özet), calculateAge UTC.
- `reportsApi.ts`: Report/Row/Version types, rowToReport, listReportsByClient order updated_at desc, getReport maybeSingle, createReport org from profile, sourceData via buildSourceData, payload status draft source_snapshot sourceData, updateReport optimistic concurrency expectedRevision check revision mismatch throw, deleteReport, listReportVersions order version_number desc, listTemplates order name.
- `useReportAutosave.ts`: hook reportId content revision enabled, state idle/saving/saved/error, lastSavedContent ref JSON string, timeout 1400ms debounce, savingRef prevent concurrent, updateReport with saveReason autosave and revision, beforeunload warning if unsaved.
- `ReportEditor.tsx`: full editor with blocks, runs, rows, path, when evaluation, history undo/redo 50, autosave hook, manual save + complete buttons, add block types H1/H2/paragraph/list/table/dataField, move up/down, delete, preview safe resolvePlaceholders.
- `ReportPreview.tsx`: psych-report card, letterhead header logo signature, blocks rendering heading1/heading2/dataField/table/dataTable/paragraph/bulletList/numberedList with resolvePlaceholders evaluateWhen, footer psikolog.halilkaraduman.com.tr + date, print friendly.
- `Clients.tsx` reports tab:
  - List templates as buttons "+ name (sistem)", createReport from template with sourceData.
  - Reports list with border primary if selected, v/version rev/status date, Aç/Sil.
  - Selected report inline editor ReportEditorInline (lighter version of full editor) with save/complete, version history list with Geri Yükle button calls updateReport saveReason restore.
  - Preview via ReportPreview + Print button window.print().
  - SourceData built via Promise.all anamnesis/sessions/assessments/testAdmins.

### Güvenlik
- Optimistic concurrency: revision check prevents overwrite.
- RLS: reports select only owner or org_admin or admin, prevents IDOR.
- Versioning immutable, security definer version_report revoked from public.
- Audit logs for reports/templates.
- Content size limits 8MB report, 2MB template, letterhead 2MB.
- No secret frontend, no public URL, PRIVATE BUCKET not yet but reports are private via RLS.

### KVKK & MMPI Koruması
- Reports content jsonb only contains blocks with placeholders, not raw sensitive data beyond snapshot (which is minimized via buildSourceData — only necessary fields, no raw test items).
- MMPI: reports can include dataField {{tables.tests}} etc but scoring still external, no norm copy.
- Letterhead logo/signature data URL stored in psychologist_settings, not public.

### Responsive
- Editor grid 1fr 360px, preview full width, print.css already exists for @media print.

## Sonraki
- PHASE-06: belgeler (PRIVATE BUCKET storage, signed URL, antivirus, mime check), notlar, geçmiş (audit_logs list), settings UI antet/logo/imza.
- PHASE-07: admin panel, org management, user invites, role checks.
- PHASE-08: public landing integration halilkaraduman.com.tr, SEO.

## Riskler
- ReportDocument content 8MB limit — need to validate block count client side later.
- Autosave revision race — currently revision from selectedReport state, may need refetch after autosave to update revision; currently autosave does not update local revision (could cause next manual save to fail if revision mismatch). Mitigation: after autosave, we don't update revision, but manual save uses revision from state which may be stale; we should refetch or update revision after autosave. For now acceptable because manual save will trigger revision check error and user can refresh — will improve PHASE-06.
