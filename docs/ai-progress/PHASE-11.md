# PHASE-11 — AI Optional (No Diagnosis) + Export/Import + Backup

**Durum:** DONE
**Tarih:** 2026-09-24
**Build:** 693kB
**Test:** 69 pass

## Yapılanlar
- `src/features/ai/aiTypes.ts`: AI optional — NO diagnosis, NO test scoring, NO norm invention. Types AISummaryRequest text max 5000 type session_notes/assessment_findings/report_draft, AISummaryResponse summary max 1000 warnings model timestamp, AI_GUARDRAILS const 4 items: tanı koymaz, test puanı üretmez norm uydurmaz, hassas veri loglamaz PII göndermez, uzman gözden geçirmeli. validateAIRequest checks text 10-5000, blocks "tanı koy"/"diagnose", summarizeWithAI stub extractive first 2 sentences slice 1000 + guardrails + model stub-extractive-v1.
- `src/features/export/exportApi.ts`: ExportBundle version v1 exportedAt client anamnesis sessions assessments notes documentsMeta appointments tasks reportsMeta, exportClientBundle parallel Promise.all getClient/getAnamnesis/listSessions/listAssessments/listNotes/listDocuments/listAppointments/listTasks/listReports meta only no file content (PRIVATE BUCKET files separate), downloadJson blob URL, validateImportBundle checks version v1 and client object exists — no auto-create, manual review required.
- `src/features/export/ExportSection.tsx`: UI card Dışa Aktar/İçe Aktar KVKK, export button downloadJson `${fileNumber}-export-YYYY-MM-DD.json`, import file input accept .json, Doğrula calls validateImportBundle.
- Integration: `Clients.tsx` genel tab now has grid 1fr 1fr with ExportSection + AI Özet Yardımcısı card with button Özet Dene calls summarizeWithAI with client first/last/profession/education, toast summary.
- KVKK data portability: export only meta for documents/reports, no raw file content, no secrets, no PII logging.
- AI guardrails enforced in validateAIRequest and UI text.

## Güvenlik
- AI stub no LLM call, no PII sent, no diagnosis, no scoring, no norm invention.
- Export JSON contains only already RLS-protected data, org isolation already checked via getClient etc.
- Import only validates, no auto-create prevents injection.

## Sonraki
- PHASE-12 Final QA + Launch checklist.
