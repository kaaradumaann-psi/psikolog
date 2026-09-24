# PHASE 02 — Danışanlar + Dosya

Status: Completed
Date: 2026-09-24
Branch: arena/01a0d39c-psikolog
Depends on: PHASE-01

---

## Completed

### 1. Clients API + types + validation

- **clientTypes.ts:** Client, ClientInput, ClientRow, ClientStatus active/archived, rowToClient, generateFileNumber `F-${year}-${time+rand}` unique per org retry, CLIENT_STATUS_LABEL
- **clientValidation.ts:** zod schema clientSchema firstName/lastName 1-80 required control char check, fileNumber optional 32, birthDate optional YYYY-MM-DD isValidDateOnly + isValidBirthDate + isFutureDateIstanbul Europe/Istanbul, phone 32, email 254 regex, profession/education 120, status enum, ClientFormValues infer
- **clientApi.ts:** ClientQuery search/status/page/pageSize, toPagedRange sanitizeIlike + DEFAULT 50 MAX 100, listClients select * count exact order created_at desc or ilike first_name/last_name/file_number + eq status + range from/to + hasMore count check, getClient maybeSingle, createClient get session userId + profile organization_id + org not found error + fileNumber auto generateFileNumber + retry 3 unique violation duplicate/unique/file_number + insert + rowToClient, updateClient partial payload trim null, archive/activate wrappers, deleteClient
- **useClients.ts:** useClients hook query/result/loading/error + fetch listClients + showToast error + useEffect query + updateQuery patch page 0 + nextPage hasMore + prevPage + refresh

### 2. Clients UI

- **ClientCard.tsx:** card interactive cursor pointer navigate /clients/:id + keyboard Enter + fileNumber + status badge success/default CLIENT_STATUS_LABEL + birthDate formatDateTR + profession + createdAt tr-TR + phone/email soft
- **ClientList.tsx:** useClients status active page 0 pageSize 20, searchInput state, onSearch form preventDefault updateQuery search page 0, form input search 80 + select status all/active/archived 140 + Ara btn primary sm + Yeni btn ghost sm navigate /clients/new, loading card Yükleniyor, error danger-soft, result header count/page/pageSize/hasMore + prev/next btns disabled, empty-state card search result yok or no client + Yeni Danışan btn, grid gap 12 ClientCard map
- **ClientForm.tsx:** Props userId initial Client|null onSuccess onCancel, useOnlineStatus, useForm RHF zodResolver clientSchema defaultValues initial or empty, loadDraft for new client draftKey + setValue first/last/birth/phone/email/profession/education, autosave draft 1s timeout saveDraft version 1 idempotencyKey crypto.randomUUID + watched values, onSubmit initial ? updateClient : createClient + fileNumber undefined + first/last trim + birth/phone/email/profession/education null + status + showToast + clearDraft + onSuccess, offline warning warning-soft + form grid 1fr 1fr fileNumber optional auto hint org unique + status select + first/last required 80 + birth date + phone + email + profession + education + buttons Vazgeç + Oluştur/Güncelle isSubmitting + draftKey TTL 30g KVKK hint
- **ClientsPage:** page-header Danışanlar + Yeni Danışan btn + ClientList
- **ClientNewPage:** user prop, kicker Yeni Danışan + title + KVKK hint + Listeye Dön + card maxWidth 640 ClientForm userId onSuccess navigate /clients/:id replace onCancel /clients
- **ClientFilePage:** id tab user props, client state loading error editing confirmArchive confirmDelete, activeTab tab||genel, tabs genel/anamnez/görüşmeler/değerlendirmeler/testler/raporlar/belgeler/notlar/geçmiş, useEffect getClient id cancelled, handleArchive archiveClient/activateClient + showToast, handleDelete deleteClient + navigate /clients replace, loading card, error not found IDOR koruması org değil veya silinmiş ID: {id}, page-header kicker fileNumber badge status + first last + birth profession education createdAt + buttons Liste Düzenle Arşivle/Aktifleştir Sil, client-tabs buttons navigate ?tab= + active, editing ? card ClientForm initial onSuccess setClient setEditing false onCancel false : activeTab genel ? grid Genel Bilgiler card grid 140px 1fr Dosya No Ad Soyad Doğum Telefon E-posta Meslek Eğitim Durum Oluşturan mono + Sonraki Adımlar PHASE-03+ card + buttons Anamnez Görüşme Rapor soft sm + activeTab !=genel ? empty-state PHASE-03+ + current client, ConfirmDialog archive + delete cascade audit log kalır

### 3. App.tsx integration

- Updated App.tsx to pass user prop to ClientNewPage and ClientFilePage

### 4. Dependencies

- Added react-hook-form, zod, @hookform/resolvers (npm install)
- Build size 607kB (was 468kB) due to zod+RHF, acceptable, future code-split

### 5. Tests extension

- **clientValidation.test.ts 8 tests:** valid, empty firstName, long 81, control char, invalid email, future birth, empty optional, generateFileNumber unique format F-YYYY-XXXXXX length 8-32
- **security.test.ts 10 subtests:** IDOR User A cannot read B, tenant isolation org B, wrong ID 0, wrong file_number 0, anon 0 or permission denied, expired session no jwt 0, role escalation PSYCHOLOG cannot update profiles 0 or permission denied, cannot insert org, cannot read audit_logs 0, admin can read audit_logs >=1
- Total 56 tests all pass (was 37), PGlite real RLS/IDOR, responsiveContracts, router, authStorage, draftStorage, build, clientValidation, security

### 6. Build + Typecheck

- typecheck OK
- build OK 90 modules → 607kB JS gzip 176kB, CSS 14kB, dist/_headers + favicon.svg

## Files changed

- src/features/clients/clientTypes.ts (new)
- src/features/clients/clientValidation.ts (new)
- src/features/clients/clientApi.ts (new)
- src/features/clients/useClients.ts (new)
- src/features/clients/ClientForm.tsx (new)
- src/features/clients/ClientCard.tsx (new)
- src/features/clients/ClientList.tsx (new)
- src/app/routes/Clients.tsx (updated from placeholder to real CRUD + file tabs + archive/delete + IDOR handling)
- src/app/App.tsx (updated to pass user)
- package.json + package-lock.json (added RHF, zod, resolvers)
- tests/clientValidation.test.ts (new, 8)
- tests/security.test.ts (new, 10 subtests)
- docs/ai-progress/PHASE-02.md (this file)

## Database changes

- No new migration (organizations/profiles/clients/audit_logs already from PHASE-01)
- file_number unique per org enforced, auto generation with retry handles duplicate

## Tests

- 56 tests, 0 fail, PGlite RLS/IDOR + validation + security negative + responsive + router + authStorage + draftStorage + build
- No E2E yet (Playwright PHASE-08)
- Critical path: Login → Dashboard → Create Client → List → Open File → Edit → Archive → Delete — manual tested via UI, automated E2E future

## Build

- typecheck: OK
- build: OK (607kB JS, 14kB CSS, dist/_headers)
- Chunk warning >500kB — future code-split with dynamic import()

## Security

- RLS org isolation tested: psy A cannot see org B, file_number unique per org, wrong ID 0, anon 0 or 42501, expired session 0, role escalation profiles 0 or 42501, org insert 0 or RLS, audit_logs psy 0 admin >=1
- Client form validation double: zod client + DB check (birth_date not future Istanbul, length, control char)
- file_number auto + retry prevents race
- Draft TTL 30g + minimal JSON + no derived (KVKK) + idempotencyKey
- No service_role frontend, no public URL, no PII log
- IDOR handling in ClientFilePage: not found shows org değil veya silinmiş

## Known issues

- Dashboard still shows — for stats (future: real counts via listClients)
- Anamnesis/Sessions/Assessments/Tests/Reports/Documents not yet (PHASE-03+)
- E2E Playwright not yet (PHASE-08)
- Storage bucket not yet used (PHASE-06)
- Build chunk >500kB — should code-split ClientForm (RHF+zod) via dynamic import in PHASE-03
- No pagination URL sync (query in state only, not in URL)
- No optimistic update for archive/delete (refetch after)

## Next phase

### PHASE-03 — Anamnez + Görüşmeler

**Yapılacaklar:**

1. Migrations: anamneses (client_id FK cascade, org FK cascade, reason current_status personal_history family_history education profession social_life relationships previous_applications previous_assessments expert_notes, created_by, created_at/updated_at, index client_id), sessions (client_id FK cascade, org FK cascade, date type duration notes observation key_points plan follow_up, created_by, index client_id+date desc)

2. RLS: anamneses/sessions select via is_org_member(org_id) + admin, insert owner+psychologist+org_member, update admin or (org_member and (owner or org_admin)), delete same, audit_logs extension

3. API + validation:
   - anamnesisTypes, anamnesisApi (get by client, create, update), validation zod text fields ≤5000?
   - sessionTypes, sessionApi (list by client date desc, get, create, update, delete), validation date not future Istanbul, type select, duration int, notes etc.

4. UI:
   - AnamnesisForm: reason, current_status, personal_history, family_history, education, profession, social_life, relationships, previous_applications, previous_assessments, expert_notes — all textarea, RHF+Zod, draft?
   - SessionList: date desc + type + duration + key_points + pagination
   - SessionForm: date, type (select: ilk görüşme, takip, değerlendirme, kriz, aile, vb), duration, notes, observation, key_points, plan, follow_up
   - ClientFile tabs integration: anamnez tab shows form + history, görüşmeler tab list + form

5. Tests: PGlite RLS for anamneses/sessions org isolation + IDOR, validation tests

6. Docs + Build: README + PHASE-03.md

**Do not repeat:**
- MMPI scoring copy
- Monolithic components
- No tests

**Success criteria:**
- Create client → anamnez → session → list works
- RLS org isolation + IDOR green
- Responsive + build green
