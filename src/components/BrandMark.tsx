import type { CSSProperties } from 'react';

/**
 * Kurumsal işaret (mark) — danışanı anımsatan tek bir figür.
 *
 * Sözlük:
 *   • Baş + omuz figürü  → masada karşı karşıya oturulan kişi, yani **danışan**.
 *   • Gövde/omuz yayı    → görüşmenin taşıyıcı zemini (klinik çerçeve).
 *   • İç çekirdek        → danışanın iç dünyası; ölçek ve formülasyonun
 *                          görünmeyeni görünür kılma amacı. Tek vurgu rengi.
 *
 * Marka işareti koyu (mürekkep) zemin üzerinde `currentColor` ile çizilir;
 * zemin rengi CSS katmanından (`--forest`) gelir. Bu yüzden aynı bileşen
 * yan panel, üst şerit, giriş ekranı, bilgi sayfası ve alt bilgide birebir
 * aynı görünür.
 *
 * `simplified` küçük boyutlarda (≤18 px) kullanılır: iç çekirdek o boyutta
 * lekeye dönüşeceği için baş tek parça çizilir.
 */
export function BrandMark({
  size = 24,
  simplified = false,
  className,
  style,
}: {
  size?: number;
  simplified?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const headPath =
    'M11.5 11.9C11.5 9.19 13.52 7 16 7C18.48 7 20.5 9.19 20.5 11.9C20.5 14.61 18.48 16.8 16 16.8C13.52 16.8 11.5 14.61 11.5 11.9Z';
  const shellPath = 'M7.3 26.6C7.3 21.8 11.2 17.9 16 17.9C20.8 17.9 24.7 21.8 24.7 26.6Z';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <path d={headPath} fill="currentColor" />
      <path d={shellPath} fill="currentColor" />
      {!simplified && <circle cx="16" cy="11.9" r="2.05" fill="var(--primary, #0a84ff)" />}
    </svg>
  );
}
