#!/usr/bin/env python3
"""Kod tipi envanteri: OCR metinlerinden YALNIZCA kod başlıklarını ve
sayısal kuralları çıkarır (bağlam ekonomisi — tam OCR metni okunmaz).

Kullanım: python3 scripts/mmpi-audit/inventory.py p050_L p050_R ...
"""
import re, sys, os

KOD_BASLIK = re.compile(
    r'(?<![0-9])('                       # başlık başlangıcı
    r'\d{2,4}\s*/\s*\d{2,4}'             # 12/21 · 123/213
    r'|\d{2,5}'                          # 1237 · 2134
    r')(?![0-9])'
    r'[^\n]{0,40}?[Kk]od',               # ardından "Kodu/Kodları"
    re.UNICODE)

SAYISAL = re.compile(
    r'(\d{1,3})\s*(?:T\b|T\s*puan|T\s*değer)'
    r'|(?:\d{1,3}\s*[-–]\s*\d{1,3})\s*T\b'
    r'|Madde\s*Sayısı\s*:?\s*(\d{1,3})', re.UNICODE)

def tara(dosya):
    yol = f'.audit/ocr/{dosya}.txt'
    if not os.path.exists(yol):
        return None, None
    txt = open(yol, encoding='utf-8', errors='replace').read()
    kodlar = []
    for m in KOD_BASLIK.finditer(txt):
        k = re.sub(r'\s+', '', m.group(1))
        if k not in kodlar:
            kodlar.append(k)
    sayilar = []
    for m in SAYISAL.finditer(txt):
        s = (m.group(0) or '').strip()
        if s and s not in sayilar:
            sayilar.append(s)
    return kodlar, sayilar

for dosya in sys.argv[1:]:
    kod, say = tara(dosya)
    if kod is None:
        print(f'{dosya}: YOK'); continue
    print(f'=== {dosya} ===')
    print(f'  KOD BASLIKLARI ({len(kod)}): {", ".join(kod) if kod else "-"}')
    if say:
        print(f'  SAYISAL: {", ".join(say[:14])}')
