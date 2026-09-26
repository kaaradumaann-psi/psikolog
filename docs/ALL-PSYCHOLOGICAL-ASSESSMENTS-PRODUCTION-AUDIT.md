# ALL PSYCHOLOGICAL ASSESSMENTS — PRODUCTION AUDIT

**Audit date:** 26 September 2026 (Europe/Istanbul)  
**Repository:** `kaaradumaann-psi/psikolog`  
**Branch:** `arena/01a0dd8d-psikolog`  
**Scope:** every active assessment route, scoring definition, response-transfer UI, local/cloud persistence mapping, revision lineage, history/report consumer, print/PDF output, source statement, responsive behavior, and runtime evidence  
**Status vocabulary:** **PASS** = directly verified; **FAIL** = measured defect remains; **UNKNOWN** = authoritative evidence or the required live environment was unavailable

> This report does not republish protected test items or response anchors. A test being present in the repository is not evidence of a license, Turkish wording provenance, norm, cutoff, or diagnostic use right.

## 1. Executive decision

Five—and only five—active instruments were found:

1. Beck Depression Inventory, original BDI / Hisli Turkish study context (**not BDI-II**)
2. Beck Anxiety Inventory (**BAI**)
3. Symptom Checklist-90-Revised (**SCL-90-R®**)
4. Generalized Anxiety Disorder-7 (**GAD-7**)
5. Patient Health Questionnaire-9 (**PHQ-9**)

The repository does not contain an active MMPI, optical mark recognition, or retired optical-form route. A regression test enforces that absence.

The instrument-specific calculation, response completeness, local immutability, revision lineage, report/history consumption, print mode, Chromium desktop/mobile behavior, and PGlite PostgreSQL migration behavior are **PASS**. No current test has a remaining measured scoring defect in the supported calculations.

The final production disposition is nevertheless **UNKNOWN**, not an unconditional PASS, for two external reasons:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were absent. The migration and real network persistence could not be exercised against the deployed Supabase project. The production bundle correctly fails closed on every assessment route rather than storing clinical data anonymously in local storage.
- Repository-specific authorization for BDI, BAI, and SCL-90-R form/digital scoring use was not available. Their installation status remains **UNKNOWN / VERIFY LICENSE**. GAD-7/PHQ-9 reproduction rights are documented by PHQ Screeners, but exact Turkish wording provenance was not established; these tools therefore also remain numeric transfer-only.

## 2. Active inventory and orphan search

| Instrument | Active route/UI | Navigation | Scoring source | Local collection | Cloud definition |
|---|---|---|---|---|---|
| BDI | `/testler/beck-depresyon` | assessment hub + client file | `beckDepression.ts` | `psikolog_bdi_tests_v2` | `00000000-0000-4000-8000-000000000002` |
| BAI | `/testler/beck-anksiyete` | assessment hub + client file | `beckAnxiety.ts` | `psikolog_bai_tests_v2` | `00000000-0000-4000-8000-000000000001` |
| SCL-90-R | `/testler/scl90` | assessment hub + client file | `scl90.ts` | `psikolog_scl90_tests_v2` | `00000000-0000-4000-8000-000000000003` |
| GAD-7 | `/testler/tarama`, GAD-7 tab | assessment hub + client file | `rapidScreening.ts` | `psikolog_screenings_v2` | `00000000-0000-4000-8000-000000000004` |
| PHQ-9 | `/testler/tarama`, PHQ-9 tab | assessment hub + client file | `rapidScreening.ts` | `psikolog_screenings_v2` | `00000000-0000-4000-8000-000000000005` |

Inventory covered route parsing, app rendering, hub cards, client history, reports, type definitions, local stores, cloud row mapping, migrations, source documentation, print components, tests, and dependency declarations. There is no sixth active or hidden scoring module. The old `/islem`, `/form`, and `/optik-form.html` paths resolve to not-found and are not assessment tools.

## 3. Instrument identity and authority

| Instrument | Identity, author/year, original language | Turkish evidence and population context | Purpose and period | Rights/provenance disposition |
|---|---|---|---|---|
| BDI | Beck, Ward, Mendelson, Mock & Erbaugh, 1961; original English BDI | Hisli, 1988/1989; Turkish university-student validation context | 21-item self-report symptom measurement; form instructions govern period | **UNKNOWN / VERIFY LICENSE**. Not BDI-II. No authorized Turkish item bank was proven. |
| BAI | Beck, Epstein, Brown & Steer, 1988; original English | Ulusoy, Şahin & Erkmen, 1998; Turkish psychometric study, predominantly adult context | Anxiety symptom total; past week including today according to authorized-form context | **UNKNOWN / VERIFY LICENSE**. No repository license or authorized Turkish wording evidence. |
| SCL-90-R | Derogatis; 1994 third-edition manual context; original English | Dağ, 1991, Turkish university students; the study cautions against treating subtests as sufficient clinical diagnosis | Broad symptom profile; authorized Turkish form instructions govern period; publisher states age 13+ | **UNKNOWN / VERIFY LICENSE**. Pearson offers forms, scoring keys, and digital products commercially. |
| GAD-7 | Spitzer, Kroenke, Williams & Löwe, 2006; original English | Konkan et al., 2013; Turkish clinical sample, reported screening reference 8 | Seven-item, last-two-weeks anxiety screening; not diagnosis | Reproduction rights **PASS** at PHQ Screeners; exact Turkish wording provenance **UNKNOWN**, so transfer-only. |
| PHQ-9 | Kroenke, Spitzer & Williams, 2001; original English | Sarı et al., 2016; 96 adult family-medicine participants, reliability evidence; no Türkiye-wide diagnostic cutoff established here | Nine scored items over the last two weeks plus separate unscored functional difficulty | Reproduction rights **PASS** at PHQ Screeners; exact Turkish wording provenance **UNKNOWN**, so transfer-only. |

No scale is represented as a diagnosis, treatment order, probability, or definitive safety decision. Population evidence is described as study context, not silently generalized as a national norm.

## 4. Protected content and response-model audit

All five web forms and all five blank print sheets are numeric response-transfer workflows. They show item numbers and score codes but do not contain or reconstruct unverified/licensed Turkish item wording.

| Instrument | IDs/count | Permitted values | Completeness behavior | Protected-content result |
|---|---:|---:|---|---|
| BDI | 1–21, exactly 21 | integer 0–3 | no score until all 21 are present and valid | PASS, transfer-only |
| BAI | 1–21, exactly 21 | integer 0–3 | no score until all 21 are present and valid | PASS, transfer-only |
| SCL-90-R | 1–90, exactly 90 | integer 0–4 | no indices until all 90 are present and valid | PASS, transfer-only |
| GAD-7 | 1–7, exactly 7 | integer 0–3 | no score until all seven are present and valid | PASS, transfer-only |
| PHQ-9 | 1–9, exactly nine | integer 0–3; separate functional code 0–3 or absent | no score until all nine scored items are present and valid; functional code is never added | PASS, transfer-only |

Strict validators reject arrays with missing IDs, duplicate IDs, out-of-range IDs, text coercions, fractions, `NaN`, invalid values, and wrong counts. Input order cannot change the result; persistence orders responses by ID. `null`, `undefined`, and blank slots never become zero. None of these instruments has reverse scoring in the supported model.

## 5. Instrument-specific scoring findings

### 5.1 BDI

- Supported formula: sum of 21 complete 0–3 responses; range 0–63.
- Turkish screening reference 17 remains explicitly a screening reference, not a diagnosis.
- Item 9 endorsement produces a neutral clinical-review flag and exact item score. It does not produce a suicide probability or risk class.
- Unsupported BDI-II identity and unverified severity/subscale claims are absent.

**Result:** calculation PASS; authorized wording/license UNKNOWN.

### 5.2 BAI

- Supported formula: sum of 21 complete 0–3 responses; range 0–63.
- Descriptive manual bands are 0–7, 8–15, 16–25, and 26–63.
- These bands are explicitly not Turkish norms, diagnostic cutoffs, or treatment rules.
- Four unsupported developer-defined subscores were removed. No reverse, weighted, or transformed scoring is generated.

**Result:** calculation PASS; Turkish diagnostic norm not claimed; license UNKNOWN.

### 5.3 SCL-90-R

- Supported complete-response calculations:
  - each of nine primary dimensions = the mapped item raw sum divided by the dimension item count;
  - GSI = all 90 raw scores divided by 90;
  - PST = count of responses greater than zero;
  - PSDI = sum of all raw responses divided by PST, with zero returned only for the mathematically defined all-zero complete form.
- Nine dimensions cover 83 unique mapped items. Seven additional items contribute to GSI/PST/PSDI and do not become a fictitious tenth dimension.
- No universal `GSI >= 1`, T-score, Turkish norm conversion, percentile, or diagnostic label is emitted.
- Items 15 and 63 create separate neutral review flags in the current scoring definition; protected wording is not reproduced. Flags do not create risk levels or decisions.

**Result:** raw calculation PASS; norm/diagnostic use intentionally not implemented; installation license UNKNOWN.

### 5.4 GAD-7

- Supported formula: sum of seven complete 0–3 responses; range 0–21.
- Original descriptive bands: 0–4, 5–9, 10–14, 15–21.
- Konkan et al. Turkish clinical-sample screening reference 8 is stored and displayed separately from the original bands.
- Neither reference is called a diagnosis or Türkiye-wide population norm.

**Result:** calculation PASS; Turkish wording provenance UNKNOWN.

### 5.5 PHQ-9

- Supported formula: sum of nine complete 0–3 responses; range 0–27.
- Original descriptive bands: 0–4, 5–9, 10–14, 15–19, 20–27.
- Functional difficulty remains separate and unscored.
- Item 9 is stored as exact response score plus a neutral review flag. The former `suicideRisk` implication is absent.
- No Turkish diagnostic threshold is asserted from the Sarı et al. reliability sample.

**Result:** calculation PASS; Turkish wording provenance UNKNOWN.

## 6. Critical-response pipeline

Critical fields use neutral names and preserve the underlying numeric response:

- BDI: item 9 endorsement and score;
- SCL-90-R: separate item 15 and item 63 review flags;
- PHQ-9: item 9 endorsement and score;
- BAI/GAD-7: no invented critical-item rule.

The fields pass through record creation, integrity checks, local persistence, cloud `result_data`, client history, clinical report readings, and result print output. Histories and reports say that a response may require clinical review; they do not state a diagnosis, percentage, definitive level, or automatic protocol. Tampered current-version cloud-derived fields are rejected before entering history/report cache.

## 7. Client, date, draft, and duplicate-entry workflow

- Every route uses the same client/date/intake structure without changing the application shell.
- A registered client makes name, gender, and age file-bound. Age is derived against the administration date.
- Manual identity remains available only in local development. A cloud-configured route requires a registered client.
- Dates use date-only validation in Europe/Istanbul context. Impossible and future dates are rejected without UTC date shifting.
- Drafts use `sessionStorage`, not persistent cross-session local storage.
- Draft keys contain schema, instrument version, client/manual identity, and administration ID. Tool switching and client switching do not leak answers.
- An identical second save is idempotent. A changed result receives a new ID, incremented revision, and link to its unchanged predecessor.
- Current UI supports correction while the completed administration remains active. Stores and database enforce revision structure for every persisted correction. A historical result is never silently made editable or overwritten.

## 8. Persistence, immutability, and revision lineage

Each current record persists:

- instrument ID and explicit instrument version;
- scoring algorithm version;
- administration ID/date and client binding;
- complete ordered responses;
- raw total/global/dimension fields applicable to that instrument;
- neutral critical flags and exact critical response values where applicable;
- completion status, creation/update timestamps;
- one-based revision and predecessor link.

Local stores reject a different valid result under the same completed ID, allow byte-equivalent retry, reject invalid lineage, and prevent deletion of current-version completed BDI, BAI, SCL-90-R, GAD-7, and PHQ-9 records.

Migration `20260926000002_assessment_result_revisions.sql` adds `instrument_version`, `scoring_version`, `revision`, and `amendment_of` to `test_administrations`. PostgreSQL triggers enforce:

- root revision = 1;
- predecessor exists and is completed;
- same organization, client, and instrument;
- exactly predecessor revision + 1;
- one successor per predecessor;
- no substantive update or delete of completed administrations/results;
- exact retry updates preserve the completed row's `updated_at`;
- a revision produces explicit `test_admin_revision` audit action.

PGlite applied the complete migration chain and passed no-op, update, delete, valid revision, branch rejection, identity mismatch, and audit-action tests. This is meaningful PostgreSQL evidence but is not a substitute for the unavailable live Supabase project.

## 9. Cloud row and synchronization audit

Cloud administration rows select a distinct system definition for each instrument and include the new identity/lineage columns. Result IDs are deterministic per administration, preventing duplicate result rows on retry. Manual results cannot be pushed without a client file.

The cloud decoder treats the parent administration/client row as authoritative rather than trusting device-local IDs embedded in JSON. Current-version results are recomputed by the instrument-specific integrity assertion; a mismatched total, index, flag, functional code, or response set is not admitted to local history/report cache.

**Live Supabase status: UNKNOWN.** No `.env`/`.env.local` credentials or process-level `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` were available. No network request was fabricated, and the migration was not claimed as applied remotely.

## 10. History and reports

A real Chromium cross-instrument workflow saved BAI, SCL-90-R, GAD-7, and PHQ-9 for one registered client, then verified:

- all four records appear in the client's assessment section;
- the section count includes rapid screeners;
- each record displays revision 1;
- a psychiatric consultation report consumes BAI, raw GSI, GAD-7, and PHQ-9 readings from the same saved objects;
- the report retains the non-diagnostic disclaimer.

Report consumers no longer reuse BAI wording for unrelated tools, no longer treat raw SCL indices as a universal clinical threshold, and no longer label PHQ item 9 as an automatic suicide-risk determination.

## 11. Print and PDF

All five blank assessment outputs are response-transfer sheets with item numbers/codes only. Result outputs include instrument/version, respondent identity, administration date, response summary, instrument-specific score fields, source/rights statement, and expert note. Protected wording is not reintroduced by print CSS.

Real Chromium `page.pdf()` generated valid `%PDF` files larger than 8 KB for BDI, BAI, SCL-90-R, GAD-7, and PHQ-9 result modes. Input/save controls were hidden in print media. This verifies browser PDF generation; the host operating system's interactive print dialog was not available and is not claimed.

## 12. Accessibility and responsive evidence

- Native radio inputs are grouped by item and wrapped in labels; fieldsets/legends identify item groups.
- Arrow-key radio navigation was verified in Chromium.
- Progress uses an accessible `progressbar` with current/max values.
- Alerts and save status use live semantic roles.
- Focus-visible styling remains present on response controls.
- Mobile score options measured **85 × 50 px** on all five tools, exceeding the 44 px touch target.
- Measured normal secondary text contrast was **5.07:1** on white; primary item legends measured **19.44:1**.
- At 1440×900, 768×1024, and 390×844, every active route had zero document-level horizontal overflow.
- Sidebar, sidebar footer, top header, route/navigation structure, and footer components were not redesigned or modernized. Tablet/mobile tests verified the same shell nodes remain attached.
- Global favicon link behavior remains in `index.html`. The icon set was normalized to the requested black `#0d0d0d` tile with white `#f6f6f6` HK mark in SVG, 16 px, 32 px, ICO, and Apple Touch formats.

## 13. Runtime and measured performance

The metrics below came from local Vite development serving and are not represented as deployed-production latency:

| Viewport | HTTP | Wall navigation range | FCP range | Horizontal overflow | Console/network failures |
|---|---:|---:|---:|---:|---:|
| Desktop 1440×900 | 200 on six audited routes | 615–750 ms | 192–384 ms | 0 px | 0 / 0 |
| Tablet 768×1024 | 200 on six audited routes | 616–744 ms | 184–368 ms | 0 px | 0 / 0 |
| Mobile 390×844 | 200 on six audited routes | 620–729 ms | 180–344 ms | 0 px | 0 / 0 |

The production build completed with 154 transformed modules. Output sizes were:

- CSS: 188.61 kB (33.13 kB gzip)
- main application JS: 581.83 kB (160.78 kB gzip)
- Supabase chunk: 223.41 kB (58.45 kB gzip)
- vendor chunk: 11.88 kB (4.20 kB gzip)

The main chunk is sizable and is a future optimization opportunity, but no measured route failure or interaction blocker was observed.

## 14. Chrome, navigation, and favicon regression

`App.tsx`, sidebar navigation structure, top-bar composition, footer composition, and route paths were not changed by this all-assessments remediation. Chromium assertions covered `.workspace-sidebar`, `.sidebar-bottom`, and `.app-header`. The `/testler` hub, all five instruments, `/kaynaklar`, client history, and reports remained navigable. The favicon remains globally linked across routes and now exactly matches the requested black-background/white-HK visual.

## 15. Source register

Authoritative or peer-reviewed sources used for the supported claims:

- Beck et al. (1961), original BDI: <https://doi.org/10.1001/archpsyc.1961.01710120031004>
- Hisli (1988, 1989), Turkish BDI studies; bibliographic details recorded in `/kaynaklar`
- Beck et al. (1988), BAI: <https://doi.org/10.1037/0022-006X.56.6.893>
- Ulusoy, Şahin & Erkmen (1998), Turkish BAI psychometric study
- Pearson SCL-90-R official product page: <https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Symptom-Checklist-90-Revised/p/100000645>
- Dağ (1991), Turkish SCL-90-R university-student validation bibliographic record: <https://turkmedline.net/detay/belirti-tarama-listesi-scl-90-rnin-universite-ogrencileri-icin-guvenirligi-ve-gecerligi/d3a3f6156970f7/tr/29+1991>
- PHQ Screeners reproduction statement: <https://www.phqscreeners.com/select-screener>
- Official PHQ/GAD scoring instructions: <https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf>
- Konkan et al. (2013), Turkish GAD-7: <https://www.noropsikiyatriarsivi.com/sayilar/415/buyuk/53-58ing.pdf>
- Sarı et al. (2016), Turkish PHQ-9 reliability: <https://www.alliedacademies.org/articles/turkish-reliability-of-the-patient-health-questionnaire9.html>

No Wikipedia, blog, forum, or copied questionnaire was used as scoring or wording authority.

## 16. Verification ledger and actual counts

### Unit/integration/database

- Full `npm test`: **293/293 PASS**, 0 failed, 0 skipped.
- BDI-focused automated tests retained from its dedicated audit: **24/24 PASS**.
- BAI strict scoring/integrity cases: **15/15 PASS**.
- SCL-90-R strict scoring/integrity cases: **16/16 PASS**.
- Rapid-screening matrix: 18 test definitions total; **14 cases exercise GAD-7** and **13 cases exercise PHQ-9**, including shared dual-tool cases; all PASS.
- Shared print policy: **5/5 PASS**.
- Shared assessment draft isolation: **6/6 PASS**.
- Cloud row identity/integrity: **6/6 PASS**.
- Local assessment revision/immutability: **6/6 PASS**.
- PostgreSQL revision test: **5 nested scenarios PASS** (Node reports six tests including the parent).
- Complete existing security/RLS/regression suite is included in the 293 total.
- `npm run build`: **PASS**.
- `git diff --check`: **PASS**.

### Real Chromium

| Instrument | Defined direct scenarios | Desktop Chromium | Mobile Chrome | Additional cross-browser executions |
|---|---:|---:|---:|---:|
| BDI | 13 | 13/13 | 13/13 | tablet route + production fail-closed gate |
| BAI | 8 | 8/8 | 8/8 | tablet route + client history/report + production gate |
| SCL-90-R | 8 | 8/8 | 8/8 | tablet route + client history/report + production gate |
| GAD-7 | 8 | 8/8 | 8/8 | tablet route + client history/report + production gate |
| PHQ-9 | 9 | 9/9 | 9/9 | tablet route + client history/report + production gate |

Aggregate real Chromium executions: **96 PASS**:

- 13 BDI desktop + 13 BDI mobile;
- 33 non-BDI desktop + 33 non-BDI mobile;
- three desktop cross-workflow/source/tablet scenarios;
- one production-bundle fail-closed scenario covering the hub and all active routes.

Firefox and WebKit binaries were unavailable. No PASS is claimed for those engines.

## 17. A–R per-instrument matrix

Legend: **P** = PASS, **U** = UNKNOWN, **F** = FAIL. “P/U” means the implemented safe behavior passed but an external authority/environment remains unknown.

| Check | BDI | BAI | SCL-90-R | GAD-7 | PHQ-9 |
|---|---|---|---|---|---|
| **A — active identity/route inventory** | P | P | P | P | P |
| **B — author/year/version identity** | P | P | P | P | P |
| **C — Turkish adaptation/population limits** | P | P | P | P | P |
| **D — item IDs/order/count** | P | P | P | P | P |
| **E — response values/completeness** | P | P | P | P | P |
| **F — instrument-specific scoring** | P | P | P | P | P |
| **G — norm/cutoff restraint** | P | P | P | P | P |
| **H — subscales/indices** | P (none asserted) | P (unsupported removed) | P (9 + globals) | P (none) | P (none) |
| **I — critical response handling** | P | P (none invented) | P | P (none invented) | P |
| **J — invalid/missing/duplicate/version integrity** | P | P | P | P | P |
| **K — client/date/draft isolation** | P | P | P | P | P |
| **L — save/reload/duplicate prevention** | P | P | P | P | P |
| **M — immutable revisions/audit trail** | P | P | P | P | P |
| **N — local + cloud mapping + live Supabase** | P/U | P/U | P/U | P/U | P/U |
| **O — history/report same source** | P | P | P | P | P |
| **P — numeric sheet/result PDF** | P | P | P | P | P |
| **Q — desktop/tablet/mobile/accessibility/runtime** | P | P | P | P | P |
| **R — material license/exact Turkish wording authority** | U | U | U | U (wording) | U (wording) |

No A–R cell has a remaining measured **FAIL**. Unknowns are deliberately retained rather than converted into unsupported PASS claims.

## 18. Final PASS / FAIL / UNKNOWN matrix

| Instrument | Clinical/scoring implementation | Local workflow + revision | Chromium/PDF/history/report | Live Supabase | License / exact Turkish wording | Final production status |
|---|---|---|---|---|---|---|
| BDI | PASS | PASS | PASS | UNKNOWN | UNKNOWN / VERIFY LICENSE | **UNKNOWN** |
| BAI | PASS | PASS | PASS | UNKNOWN | UNKNOWN / VERIFY LICENSE | **UNKNOWN** |
| SCL-90-R | PASS | PASS | PASS | UNKNOWN | UNKNOWN / VERIFY LICENSE | **UNKNOWN** |
| GAD-7 | PASS | PASS | PASS | UNKNOWN | reproduction PASS; exact Turkish wording UNKNOWN | **UNKNOWN** |
| PHQ-9 | PASS | PASS | PASS | UNKNOWN | reproduction PASS; exact Turkish wording UNKNOWN | **UNKNOWN** |

### Release conditions

Before claiming full production PASS:

1. verify and document organization-specific BDI/BAI/SCL-90-R form and digital scoring authorization;
2. establish an authoritative exact Turkish GAD-7/PHQ-9 form provenance before showing item wording;
3. apply the new migration to the real Supabase project and run insert, idempotent retry, valid correction, forbidden overwrite/delete, audit-log, reload, and second-browser tests;
4. run the same route/PDF matrix against the authenticated deployed production origin;
5. add Firefox/WebKit evidence if cross-engine support is a release requirement.

Until those external conditions are met, numeric transfer mode plus fail-closed production configuration is the correct safe posture.
