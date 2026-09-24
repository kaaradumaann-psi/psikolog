# AI Interpretation Audit (PHASE 11)

AI yorum katmanı denetimi. Kural (görev talimatı §39): **AI hesaplama yapmaz.**
AI'ya yalnızca doğrulanmış scoring çıktısı verilir ve kaynak kurallarına göre
yorum yaptırılır.

---

## Denetlenen modüller

| Modül | İşlev | Durum |
|---|---|---|
| `src/ai/aiInterpretation.ts` | AI yorum istemcisi, profil özeti ve önbellek | ✅ **DENETLENDİ · UYUMLU** |
| `src/components/results/AiInterpretationPanel.tsx` | AI yorum kullanıcı arayüzü ve durum yönetimi | ✅ **DENETLENDİ · UYUMLU** |
| `supabase/functions/ai-interpretation/index.ts` | Edge Function sunucu tarafı, LLM istemi, yetki ve hız limiti | ✅ **DENETLENDİ · UYUMLU** |
| `tests/aiSummaryPrivacy.test.ts` | Gizlilik ve KVKK regresyon testi | ✅ **3/3 PASS** |
| `tests/aiInterpretation.test.ts` | Profil özeti, ölçek haritalama ve istem sınırları testi | ✅ **5/5 PASS** |

---

## Denetim Bulguları ve Sonuçları

### FINDING-AI-001 — AI'ya ne gönderiliyor? (§39 Uyumu)

Kontrol edilen hususlar:
1. **Ham cevap matrisi (1-566) LLM'e gidiyor mu?**
   - **SONUÇ: HAYIR (UYUMLU ✅).** `buildAiProfileSummary` ve `safeSummary` işlevleri yalnızca önceden doğrulanmış ölçek skorlarını (`scales`: id, raw, k, t, level) ve geçerlik özetini (`validity`: cannotSay, l, f, k, fMinusK, status, config) aktarır. 566 maddelik ham cevap dizisi hiçbir zaman isteme dâhil edilmez. `tests/aiSummaryPrivacy.test.ts` ve `tests/aiInterpretation.test.ts` ile kilitlenmiştir.
2. **İstemde T puanları ve bant etiketleri mi, yoksa AI'ya "hesapla" talimatı mı var?**
   - **SONUÇ: DOĞRULANMIŞ SKORLAR AKTARILIYOR (UYUMLU ✅).** Tüm T puanları, K düzeltmeleri ve düzey etiketleri TypeScript skorlama motoru (`mmpiScoring.ts`) tarafından hesaplanır; AI'ya hesaplama yaptırılmaz. Sistem istemi kesin kural koyar: *"Yalnızca sana sağlanan sayısal profil özetini kullan; özetin dışında veri, hasta bilgisi veya olay varsayma."*
3. **Klinik güvenlik ve karar destek sınırları:**
   - **SONUÇ: KORUMALI (UYUMLU ✅).** Edge Function sistem istemi açık direktifler taşır:
     - `Tanı KOYMA`: Kesin tanı ifadeleri ("hastalığıdır", "tanısı şudur") yasaklanmıştır.
     - `Tedavi/ilaç önerme`: Tedavi veya ilaç tavsiyesi verilmesi yasaklanmıştır.
     - `Kesin klinik karar verme`: Yalnızca bulguya dayalı, olasılık dilinde cümleler kurulur.
     - `Geçerlik önceliği`: Geçerlik bulguları (boş, L, F, K, F-K) klinik yorumdan ÖNCE ele alınır; profil şüpheli/geçersizse sınırları açıkça belirtilir.
     - 4 başlıklı yapı zorunludur: 1) Geçerlik değerlendirmesi 2) Klinik profil özeti 3) Dikkat çeken bulgular 4) Uzman için öneriler.

### FINDING-AI-002 — Source Trace ve Kaynak Atfı Değerlendirmesi (§40)

- Sistem istemi, değerlendirmenin temelini açıkça belirler:
  `Sen MMPI-566 (Türkiye standardizasyonu, 566 maddelik klasik form) sonuçlarını yorumlayan bir klinik karar destek asistanısın.`
- **Kaynak kuralı izlenebilirliği analizi:**
  MMPI mimarisinde tüm klinik kodlar, geçerlik konfigürasyonları ve Bölüm 6 profil örüntüleri deterministik TypeScript motorunda (`src/scoring/mmpiInterpretation.ts`) kaynak sayfa ve şekil numaralarıyla (`s.36`, `s.160 · Şekil 23` vb.) üretilmekte ve arayüzde doğrudan gösterilmektedir.
- LLM'e yapay veya serbest `SOURCE-*` ID'leri ürettirmek halüsinasyon riski doğuracağından, modelin karar destek metni vermesi ve kaynak doğrulamalarının deterministik motor tarafından sağlanması mimari olarak en güvenli çözümdür.

### FINDING-AI-003 — KVKK, Güvenlik ve Yetkilendirme

1. **KVKK / Sahte İsimlendirme (m.4/3-d):**
   Danışan adı, soyadı, T.C. kimlik no veya serbest kimlik metni LLM istemine asla taşınmaz. Yalnızca yaş (16-120 aralığında, norm geçerliliği için) ve cinsiyet (Türk norm tablosu ayrımı için) aktarılır. Sınır dışı yaşlar `null` yapılır.
2. **Kimlik Doğrulama ve Rol Yetkisi:**
   Supabase Auth Bearer JWT her çağrıda `adminClient.auth.getUser(token)` ile doğrulanır. Kullanıcının aktif ve `ADMIN` ya da `PSYCHOLOG` rolünde olması şart koşulur.
3. **IDOR ve Kayıt Sahipliği Güvenliği:**
   `mode='record'` çağrılarında, `mmpi_records` tablosundaki kaydın çağıran kullanıcıya ait olduğu (veya çağıranın Admin olduğu) doğrulanmadan model çağrılmaz.
4. **Hız Limiti (Rate Limiting):**
   Kullanıcı başına 1 istek / 10 saniye ve en fazla 20 istek / saat en iyi çaba hız limiti uygulanır.
5. **API Anahtarı Güvenliği:**
   `AI_API_KEY` sırrı yalnız sunucu tarafında (Edge Function) saklanır, istemciye asla sızmaz.
6. **Önbellekleme:**
   İstemcide 24 saatlik önbellek (localStorage) tutulur; profil özetinin djb2 özetiyle eşleştirilir ve kullanıcı ID'sine bağlanır.

---

## Bağımlılık Matrisi

```
PHASE 2  (madde anahtarları — Ek 9)          ✅ DONE (46/46 MATCH, 5 P0 FIXED)
PHASE 3  (validity)                          ✅ DONE (kitap s.29-42)
PHASE 4  (K correction + 15 konfig)          ✅ DONE (CHANGE-007..010)
PHASE 5  (clinical — Tablo 8..17)            ✅ DONE (Tablo 8-17 TAMAMI birebir MATCH)
PHASE 6  (norms — Tablo 30)                  ✅ DONE (26/26 MATCH)
PHASE 7  (subscales)                         ✅ N/A (MMPI-1 standardında alt ölçek yok)
PHASE 8  (derived — Ek 9c + Wiggins)          ✅ DONE (26/26 + anahtarlar)
PHASE 9  (code types — Bölüm 5)              ✅ KAYNAK TARAMASI DONE (CHANGE-014 uygulandı)
PHASE 10 (interpretation — Bölüm 6)          ✅ DONE (Bölüm 6 + desen kartları; CHANGE-015/016)
   ↓
PHASE 11 (AI interpretation)                 ✅ DONE (Güvenlik, KVKK, istem sınırları ve testler tamam)
   ↓
PHASE 12 (UI) & PHASE 13 (Report)
```

**Sonuç:** PHASE 11 başarıyla tamamlandı. Yapay zekâ yorum katmanı §39 klinik karar destek kısıtlamalarına, KVKK m.4/3-d anonimlik şartlarına ve güvenli yetkilendirme sözleşmesine tam uyumludur.
