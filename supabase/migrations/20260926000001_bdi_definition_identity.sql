-- BDI system definition identity correction.
-- No response/result schema change is required: versioned BDI metadata remains in
-- test_results.result_data JSONB and every administration keeps its own row.

update public.test_definitions
set
  name = 'Beck Depresyon Envanteri (BDI; BDI-II değil)',
  description = '1961 özgün BDI ailesi / Hisli 1988–1989 Türkçe bağlamı; 21 × 0–3 toplam (0–63), yetkili form yanında puan aktarımı; madde 9 için nötr klinik değerlendirme bayrağı'
where id = '00000000-0000-4000-8000-000000000002'
  and is_system = true;
