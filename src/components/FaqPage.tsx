const FAQ = [
  {
    q: 'Bu sistem ne işe yarar?',
    a: 'Danışan dosyası, anamnez, SOAP seans notu, randevu, görev, belge, rapor ve psikometrik ölçekleri (Beck Depresyon, Beck Anksiyete, SCL-90-R, GAD-7, PHQ-9) tek çalışma alanında tutar.',
  },
  {
    q: 'Veriler nerede durur?',
    a: 'Supabase yapılandırılmadığında tüm klinik kayıt bu cihazda, tarayıcının yerel deposunda kalır. JSON yedek indirip geri yükleyebilirsiniz. Bulut kullanıldığında erişim kurum bazında RLS ile sınırlanır; public kayıt yoktur.',
  },
  {
    q: 'Ölçekler tanı koyar mı?',
    a: 'Hayır. Kesme noktaları tarama ve şiddet bandı içindir. Madde 9 (BDI ve PHQ-9) intihar düşüncesi uyarısı üretir; güvenlik protokolünü işletmek uzmanın sorumluluğundadır.',
  },
  {
    q: 'Seans öncesi ne görürüm?',
    a: 'Ana sayfa bugünkü randevuyu son seans, ev ödevi, ölçek değişimi ve güvenlik uyarısıyla açar. Formülasyon ve güvenlik planı danışan dosyasındadır. Puanlar tarama bandıdır, tanı değildir.',
  },
  {
    q: 'Rapor nasıl yazdırılır?',
    a: 'Raporlar sayfasında A4 yazdır kullanılır. Antet, uzman adı ve kaşe görseli Ayarlar’dan kaydedilir ve yeni raporlara yazılır.',
  },
  {
    q: 'Kim hesap açabilir?',
    a: 'Halka açık kayıt yoktur. Bulut modunda psikolog hesabını yalnızca yönetici, Edge Function üzerinden oluşturur.',
  },
] as const;

export function FaqPage() {
  return (
    <div className="faq-list">
      {FAQ.map((item) => (
        <details key={item.q} className="modern-table-card" style={{ padding: '14px 16px', marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{item.q}</summary>
          <p style={{ margin: '10px 0 0', color: 'var(--soft)', lineHeight: 1.55 }}>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
