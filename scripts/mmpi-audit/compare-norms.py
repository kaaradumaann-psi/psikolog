#!/usr/bin/env python3
"""Tablo 30 (kitap s.195) norm değerlerini TURKISH_NORMS ile karşılaştırır.

Kaynak: Ceyhun & Oral (2003), "Tablo 30. Normal Türk, Erkek ve Kadınların MMPI
Alt Testlerindeki Ortalama ve Standart Sapmaları", kitap s.195 (PDF p105 R).
Değerler tam sayfa yüksek çözünürlüklü GÖRSEL okumayla girilmiştir (OCR
bu sayfayı boş döndürmüştü).

Değerlendirme kuralı (kaynaktan):
Tablo 30, K düzeltmesi UYGULANMIŞ ve UYGULANMAMIŞ satırları ayrı ayrı verir.
Kod, T dönüşümünden ÖNCE K düzeltmesini uyguladığı için (mmpiScoring.ts →
computeT) karşılaştırmada **K eklenmiş satırlar** esas alınır:
  Hs+.5K, Pd+.4K, Pt+1K, Sc+1K, Ma+.2K
K eklenmemiş ham satırlar (Hs, Pd, Pt, Sc, Ma) yalnızca kayıt amaçlı basılır.

Girdi : .audit/code-keys.json (normlar için ayrıca okunmaz; değerler elle
        girilmiştir — mmpiKeys.ts ile senkron tutulmalıdır)
"""
import sys

# --- Tablo 30, kitap s.195 (görsel okuma) -----------------------------------
# K düzeltmesi UYGULANMIŞ satırlar (T dönüşümünde kullanılanlar)
SRC = {
    "Erkek": {
        "L":  (6.45, 2.74), "F":  (8.30, 4.62), "K":  (13.98, 4.65),
        "Hs": (13.19, 4.07),                       # Hs+.5K
        "D":  (20.63, 4.76), "Hy": (19.31, 4.71),
        "Pd": (22.22, 4.45),                       # Pd+.4K
        "Mf": (29.21, 3.82), "Pa": (11.12, 4.03),
        "Pt": (27.90, 6.30),                       # Pt+1K
        "Sc": (29.82, 9.05),                       # Sc+1K
        "Ma": (19.96, 4.40),                       # Ma+.2K
        "Si": (23.86, 7.97),
    },
    "Kadın": {
        "L":  (6.00, 2.25), "F":  (9.38, 5.16), "K":  (11.82, 3.80),
        "Hs": (15.89, 4.88), "D":  (23.86, 5.08), "Hy": (18.12, 5.31),
        "Pd": (22.84, 4.51), "Mf": (32.98, 3.67), "Pa": (11.93, 4.17),
        "Pt": (29.20, 6.59), "Sc": (31.06, 8.20), "Ma": (19.72, 4.36),
        "Si": (29.88, 7.52),
    },
}

# Tablodaki örneklem büyüklükleri (N sütunları)
SRC_N = {"Erkek": 1003, "Kadın": 663}

# Kayit amacli: K düzeltmesi UYGULANMAMIŞ ham satirlar (kod bunlari kullanmaz)
SRC_RAW = {
    "Erkek": {"Hs": (6.20, 4.65), "Pd": (16.62, 4.87), "Pt": (13.91, 8.88),
              "Sc": (13.83, 11.75), "Ma": (17.16, 4.83)},
    "Kadın": {"Hs": (9.98, 5.31), "Pd": (22.33, 4.82), "Pt": (19.08, 8.30),
              "Sc": (19.24, 10.03), "Ma": (17.35, 4.62)},
}

# --- mmpiKeys.ts -> TURKISH_NORMS (elle senkron) ----------------------------
CODE = {
    "Erkek": {
        "L":  (6.45, 2.74), "F":  (8.3, 4.62), "K":  (13.98, 4.65),
        "Hs": (13.19, 4.07), "D":  (20.63, 4.76), "Hy": (19.31, 4.71),
        "Pd": (22.22, 4.45), "Mf": (29.21, 3.82), "Pa": (11.12, 4.03),
        "Pt": (27.9, 6.3), "Sc": (29.82, 9.05), "Ma": (19.96, 4.4),
        "Si": (23.86, 7.97),
    },
    "Kadın": {
        "L":  (6.0, 2.25), "F":  (9.38, 5.16), "K":  (11.82, 3.8),
        "Hs": (15.89, 4.88), "D":  (23.86, 5.08), "Hy": (18.12, 5.31),
        "Pd": (22.84, 4.51), "Mf": (32.98, 3.67), "Pa": (11.93, 4.17),
        "Pt": (29.2, 6.59), "Sc": (31.06, 8.2), "Ma": (19.72, 4.36),
        "Si": (29.88, 7.52),
    },
}

ORDER = ["L", "F", "K", "Hs", "D", "Hy", "Pd", "Mf", "Pa", "Pt", "Sc", "Ma", "Si"]


def main() -> int:
    print("=" * 78)
    print("Tablo 30 (kitap s.195) <-> TURKISH_NORMS  [26 hucre]")
    print("=" * 78)
    match = diff = 0
    problems = []
    for g in ("Erkek", "Kadın"):
        print(f"\n--- {g} (kaynak N={SRC_N[g]}) ---")
        for k in ORDER:
            s, c = SRC[g][k], CODE[g][k]
            ok = abs(s[0] - c[0]) < 0.005 and abs(s[1] - c[1]) < 0.005
            if ok:
                match += 1
                tag = "MATCH"
            else:
                diff += 1
                tag = "DIFF "
                problems.append(f"{g}/{k}: kaynak={s} kod={c}")
            print(f"  {k:4s} kaynak={s[0]:7.2f}/{s[1]:5.2f}   kod={c[0]:7.2f}/{c[1]:5.2f}   [{tag}]")

    print("\n" + "=" * 78)
    print(f"MATCH={match}  DIFF={diff}  (toplam 26)")
    print("=" * 78)

    print("\nK düzeltmesi UYGULANMAMIŞ ham satırlar (kayıt amaçlı; kod kullanmaz):")
    for g in ("Erkek", "Kadın"):
        for k, v in SRC_RAW[g].items():
            print(f"  {g} {k:3s} ham={v[0]:6.2f}/{v[1]:5.2f}")

    if problems:
        print("\nFARKLAR:")
        for p in problems:
            print("  " + p)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
