# MMPI Audit State Metrics

<!--
Generated from repository state.
Do not manually edit numeric metrics.
Regenerate with the audit state command.
-->

**Generated at:** `2026-09-23T00:06:07.064Z`  
**Command:** `node scripts/mmpi-audit/state.mjs`  
**Phase:** `20 (PRODUCTION_VALIDATION_PHASE_18_19_20)`  
**Clinical Logic Changed:** `NO`

---

## 1. Test Metrics

| Metric | Value | Status |
|---|---|---|
| Test Suites | `106` | PASS |
| Passed Tests | `610` | PASS |
| Failed Tests | `0` | PASS |
| Total Tests | `610` | PASS |
| TypeScript Typecheck | `PASS` | PASS |
| Production Build | `PASS` | PASS |

---

## 2. Code Interpretation Metrics

| Category | Count | Note |
|---|---|---|
| Canonical Codes (`CODES`) | `45` | Two-digit canonical interpretations |
| Block Codes (`BLOCK_CODES`) | `151` | Total block-scoped code keys |
| Block Own Bodies | `76` | Independent interpretation text bodies |
| Block Aliases | `75` | Cross-scale aliases referencing own bodies |

---

## 3. Conflict and Decision Metrics

| Category | Headings | Unique IDs | Duplicate IDs (Decision Gates) |
|---|---|---|---|
| `CONFLICTS.md` | `68` | `43` | `CONFLICT-016, CONFLICT-019, CONFLICT-020, CONFLICT-024, CONFLICT-025, CONFLICT-026, CONFLICT-027, CONFLICT-030, CONFLICT-036` |
| `DECISIONS.md` | `35` | `34` | `DECISION-028` |

*Note: Duplicate IDs represent historical extensions or split decisions and are tracked as quality metrics / decision gates without silent renaming.*

---

## 4. Documentation & Source Audit

| Item | Value | Status |
|---|---|---|
| Audit Directory Files (`docs/mmpi-audit`) | `20` | Consolidated |
| `SOURCE_INDEX.md` | `Present` | Verified |
| `SOURCE_FACTS.md` | `Present` | Verified |
| `docs/kaynak-denetimi.md` | `Present` | Verified |
| Source PDF (`docs/sources/mmpi-kitap.pdf`) | `Present` | Verified |

---

## 5. Content Verification Summary

| Component | Target Count / Scope | Code Status |
|---|---|---|
| Item Scoring Keys | 46 scales (Ek 9a/b/c) | 46/46 Verified |
| Clinical Scales Keys | Tablo 8–17 (Hs..Si, s.63–158) | 10/10 Verified |
| Turkish Adult Norms | Tablo 30 (s.195) | 26/26 Verified |
| Wiggins Content Norms | Tablo 20 (s.183) | 26/26 Verified |
| Validity Configurations | Bölüm 4 (Şekil 8–22) | 15/15 Verified |
| Profile Patterns | Bölüm 6 (Şekil 16 & Şekil 23–32) | 19/19 Verified |
| Critical Items | Ek 1 (s.215–233) | 39 items Verified |
