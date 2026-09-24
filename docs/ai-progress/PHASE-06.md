# PHASE-06 — Belgeler (PRIVATE BUCKET) + Notlar + Geçmiş

**Durum:** DONE
**Tarih:** 2026-09-24
**Commit:** pending
**Build:** 693kB JS gzip 192kB
**Test:** 68 pass (was 56)

## Migration: 20260924000004_phase06_documents_notes.sql
- Storage bucket `client-documents` private false public false file_size_limit 50MB allowed_mime_types pdf/jpg/png/webp/msword/docx/txt — insert on conflict update.
- Storage policies tenant isolation via `storage.foldername(name)[1]` = org_id: select/insert/update/delete for authenticated using is_active_user() and (is_admin() or is_org_member(foldername[1]::uuid)), insert check foldername[2] not null.
- `documents` table: client_id FK cascade, organization_id FK, file_path 1-1024, file_name 1-255, mime_type 1-127, size_bytes 0-50MB, description <=1000, created_by FK, indexes client created_at desc, org, created_by, set_updated_at trigger, audit trigger documents_audit.
- `notes` table: client_id FK cascade, org FK, content 1-8000 btrim, is_pinned bool default false, created_by, indexes client is_pinned desc created_at desc, org, set_updated_at, audit trigger notes_audit.
- Audit_logs check constraint extended to include document_insert/update/delete, note_insert/update/delete, appointment_insert/update/delete, task_insert/update/delete (full list).
- RLS: documents/notes select is_admin or is_org_member, insert owner+active+org_member+role+exists client org match, update/delete is_admin or org_member and (owner or org_admin).
- revoke anon, grant authenticated.

## Types/API/UI
- `documentTypes.ts`: Document/Row, rowToDocument, ALLOWED_MIMES, MAX_SIZE 50MB.
- `documentApi.ts`: listDocumentsByClient order created_at desc, uploadDocument mime check ALLOWED_MIMES size MAX_SIZE, org check client org == profile org, fileId uuid, safeName replace [^a-zA-Z0-9._-], filePath `${orgId}/${clientId}/${fileId}-${safeName}`, storage upload then insert documents row, cleanup on DB error, deleteDocument db delete + storage remove (warn but not fail), getSignedUrl createSignedUrl expires 3600.
- `DocumentList.tsx` DocumentSection: load, uploading state, description input 1000, file input accept pdf/jpg/jpeg/png/webp/doc/docx/txt, handleUpload calls uploadDocument, handleDownload getSignedUrl window.open, delete ConfirmDialog.
- `noteTypes.ts`: Note/Row rowToNote.
- `noteApi.ts`: listNotesByClient order is_pinned desc created_at desc, createNote org check, updateNote content/isPinned, deleteNote.
- `NoteSection.tsx`: load, create textarea 8000, edit inline, pin toggle sort pinned first, delete ConfirmDialog.
- `ClientFilePage` integration: belgeler tab => DocumentSection, notlar tab => NoteSection, geçmiş tab => listAuditLogsByClient (target_id=clientId) with RLS ADMIN/ORG_ADMIN only note.

## Güvenlik
- PRIVATE BUCKET: public false, no public URL, only signed URL 1h via createSignedUrl.
- Path org_id/client_id/fileId-name ensures tenant isolation, storage policies check foldername org.
- RLS documents/notes prevents IDOR (org check + owner or org_admin).
- File type allowlist, size limit 50MB both storage bucket and documents table check.
- Audit logs for documents/notes.
- KVKK: minimal metadata, no sensitive data logging, file_name sanitized.

## Responsive
- Document/Note cards flex wrap, buttons 44px touch via existing responsive.css.

## Test
- securityExtended.test.ts covers documents/notes IDOR: PSY_B cannot read ORG_A docs/notes, anon 0 or 42501, bucket private false, admin can read.

## Sonraki
- PHASE-07 appointments/tasks/settings/admin/audit.
