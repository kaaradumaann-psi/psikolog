-- ===========================================================================
-- PHASE-07 / P0-3 — Anamnez ve danışan alanlarının mevcut veri modeliyle hizası
--
-- Gerekçe: istemci veri modelinde (src/clinical/clinicalTypes.ts) bulunan
-- klinik alanların bir bölümü şemada karşılıksızdı; bulut kalıcılığı için
-- bu alanların nereye yazılacağı belirsiz kalıyordu. Aşağıdaki kolonlar
-- mevcut tablolara eklenir (yeni tablo açılmaz):
--   clients   : gender, marital_status, emergency_contact
--   anamneses : medical_history, medications, allergies_notes, diagnoses
--
-- Kapsam dışı bırakılanlar (bilinçli karar):
--   tc_number  → veri minimizasyonu: DB'ye yazılmaz, cihazda kalır.
--   age        → birth_date'ten türetilir (saklanan türev veri yok).
--
-- Non-destructive: yalnızca ADD COLUMN + COMMENT. Rollback: kolonlar boş kalır.
-- ===========================================================================

alter table public.clients
  add column if not exists gender text check (gender is null or gender in ('ERKEK', 'KADIN')),
  add column if not exists marital_status text check (marital_status is null or char_length(marital_status) <= 40),
  add column if not exists emergency_contact jsonb check (
    emergency_contact is null or (jsonb_typeof(emergency_contact) = 'object' and octet_length(emergency_contact::text) <= 4096)
  );

-- Danışan durum akışı (active/followup/completed/archived) şemada da korunur
alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients add constraint clients_status_check
  check (status in ('active', 'followup', 'completed', 'archived'));

-- Randevu ücret/ödeme alanları (istemci: Appointment.fee / paymentStatus)
alter table public.appointments
  add column if not exists fee numeric(10, 2) check (fee is null or fee >= 0),
  add column if not exists payment_status text check (payment_status is null or payment_status in ('paid', 'pending', 'waived'));

alter table public.anamneses
  add column if not exists medical_history text check (medical_history is null or char_length(medical_history) <= 5000),
  add column if not exists medications text check (medications is null or char_length(medications) <= 2000),
  add column if not exists allergies_notes text check (allergies_notes is null or char_length(allergies_notes) <= 2000),
  add column if not exists diagnoses jsonb check (diagnoses is null or jsonb_typeof(diagnoses) = 'array');

comment on column public.anamneses.medical_history is 'Tıbbi özgeçmiş / kronik hastalıklar (istemci: Client.medicalHistory)';
comment on column public.anamneses.medications is 'Düzenli kullanılan ilaçlar (istemci: Client.medications)';
comment on column public.anamneses.allergies_notes is 'Önemli notlar / alerjiler (istemci: Client.allergiesNotes)';
comment on column public.anamneses.diagnoses is 'DSM-5/ICD-10 tanı ve ön tanı listesi (istemci: Client.diagnoses)';
comment on column public.anamneses.previous_applications is 'Psikiyatrik geçmiş / önceki terapi deneyimleri (istemci: Client.psychiatricHistory)';
comment on column public.test_results.result_data is
  'Ölçek sonucu: puan/band özeti + yeniden üretim için madde yanıtları ve yorum. Ham görüntü/optik form saklanmaz.';
