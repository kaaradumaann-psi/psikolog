# PHASE-04 — Değerlendirmeler & Testler (Harici Kaynak)

**Durum:** DONE
**Tarih:** 2026-09-24
**Commit:** pending
**Build:** 653kB JS gzip 185kB
**Test:** 56 pass

## Yapılanlar

### Migration: 20260924000002_phase04_assessments_tests.sql
- `assessments` table: client_id FK cascade, org FK, reason <=5000, assessment_date date not future Istanbul via validate_assessment_date trigger, method <=2000, interview/observation/findings/expert_evaluation/result/recommendations <=8000, created_by, indexes client_date desc, org, set_updated_at trigger, validate date trigger.
- `test_definitions` table: organization_id nullable FK (null => system), name 1-180, description <=2000, source check in ('mmpi','other','beck','scl90','mmpi2','custom'), is_system bool, check (is_system and org null) or (not is_system). Seed 3 system rows: MMPI (Harici) id 000...001, Beck 002, SCL-90-R 003 with description "MMPI harici değerlendirme kaynağı — puanlama yeni sistemde yapılmaz, sadece özet ilişkilendirilir".
- `test_administrations` table: client_id FK cascade, assessment_id FK set null, test_definition_id FK restrict, org FK, administration_date date, status in planned/in_progress/completed/cancelled default completed, external_source <=32, external_assessment_id <=128, notes <=5000, created_by, indexes client_date desc, org, assessment, set_updated_at.
- `test_results` table: test_administration_id FK cascade, org FK, result_data jsonb object <=2MB, summary <=5000, indexes admin, org, set_updated_at.
- Audit triggers: assessments_audit, test_admin_audit, test_results_audit.
- RLS: enable all, policies:
  - assessments: select is_admin or is_org_member, insert owner+active+org_member+psychologist/org_admin/admin, update/delete is_admin or org_member and (owner or org_admin)
  - test_definitions: select active_user and (is_system or is_org_member or is_admin), insert not is_system and org_member and psychologist/org_admin/admin, update/delete not is_system and is_admin or org_admin
  - test_administrations: select is_admin or is_org_member, insert owner+active+org_member+role + exists client org match, update/delete is_admin or org_member and (owner or org_admin)
  - test_results: select is_admin or org_member, insert active+org_member+role+exists admin org match, update/delete is_admin or org_member
- revoke anon, grant authenticated.

### Types/API/UI
- `assessmentTypes.ts`: Assessment/Row/Input, rowToAssessment.
- `assessmentApi.ts`: listAssessmentsByClient, createAssessment org check, updateAssessment, deleteAssessment.
- `AssessmentForm.tsx`: reason 5000, assessmentDate isValidDateOnly+isFutureDateIstanbul, method 2000, interview/observation/findings/expert_evaluation/result/recommendations 8000.
- `AssessmentList.tsx`: list, delete ConfirmDialog.
- `testTypes.ts`: TestDefinition/TestAdministration/TestResult Row types + rowTo* converters.
- `testApi.ts`: listTestDefinitions order name, listTestAdministrationsByClient join test_definitions, createTestAdministration org check client org, createTestResult org from admin, listTestResultsByAdministration.
- `TestForms.tsx`: TestAdminForm (testDefinitionId required, administrationDate isValidDateOnly, externalSource 32, externalAssessmentId 128, notes 5000) with note "MMPI puanlama bu sistemde yapılmaz — sadece harici kaynak olarak ilişkilendirilir", TestResultForm (summary 5000, resultJson valid JSON object) with note "Ham MMPI soruları/normları/scoring kopyalanamaz — sadece özet sonuç", TestAdminList.
- `ClientFilePage` tab integration: değerlendirmeler tab => AssessmentForm toggle + AssessmentList refreshKey, testler tab => TestAdminForm toggle + TestAdminList + TestResultForm modal via testResultFor state.

### MMPI Koruması
- **Yasaklara uyum:** No scoring, no norms, no questions copied. test_definitions seed only says "MMPI (Harici) — puanlama yeni sistemde yapılmaz, sadece özet ilişkilendirilir". test_results result_data is generic jsonb summary, not raw answers. external_source field allows assessment.source="mmpi" pattern. UI explicitly warns.
- Architecture doc PHASE-00 already states new system only relates as external source.

### Güvenlik
- Assessments/tests org checks prevent IDOR.
- RLS mirrors clients: tenant isolation via organization_id, owner check, org_admin override.
- test_definitions system rows readable by all active users, org rows only own org.
- Audit logs for all.

### KVKK
- Minimal, no raw test items, result_data <=2MB, summary 5000, no PII logging.

## Sonraki
- PHASE-05 reports/templates done same batch.
