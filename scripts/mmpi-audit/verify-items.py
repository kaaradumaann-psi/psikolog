#!/usr/bin/env python3
"""Ek 1 (kitap s.215-233) madde metinlerini GÖRSEL doğrulama için kırpar.

OCR satır sırası güvenilir değildir (kimi sayfada numara metinden önce, kimi
sayfada sonra gelir; bkz. OCR_ISSUES.md → ITEM-ORDER). Bu yüzden madde
metinleri OCR'a bırakılmaz: RapidOCR yalnızca **numaranın konumunu** bulmak
için kullanılır, metnin kendisi yüksek DPI görselden okunur.

Kullanım:
    python3 scripts/mmpi-audit/verify-items.py --ids 27,33,44,48 --out gl1

Çıktı:
    .audit/items/<out>.png  (hedef maddeler alt alta, numaralarıyla birlikte)
    stdout: bulunan numara kutuları (sayfa, y, tespit edilen sayı)
"""

from __future__ import annotations

import argparse
import os
import re
import sys

import cv2
import numpy as np
import pymupdf
from rapidocr_onnxruntime import RapidOCR

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF = os.path.join(REPO, "docs", "sources", "mmpi-kitap.pdf")
OUT = os.path.join(REPO, ".audit", "items")

# Ek 1: kitap s.215-233 → leaf = s+15
FIRST_LEAF, LAST_LEAF = 215 + 15, 233 + 15


def page_half_png(doc, leaf: int, dpi: int) -> np.ndarray:
    """leaf numaralı kitap sayfasını görüntü olarak döndürür (L=sol, R=sağ)."""
    pdf_index = (leaf - 1) // 2  # 0 tabanlı
    half = "R" if leaf % 2 == 0 else "L"
    page = doc[pdf_index]
    w, h = page.rect.width, page.rect.height
    clip = pymupdf.Rect(0.5 * w, 0, w, h) if half == "R" else pymupdf.Rect(0, 0, 0.5 * w, h)
    pix = page.get_pixmap(dpi=dpi, clip=clip)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
    elif pix.n == 3:
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    return img


def find_numbers(ocr: RapidOCR, img: np.ndarray) -> dict[int, list[int]]:
    """Sayfadaki madde numaralarının y konumlarını bulur: {sayı: [y, ...]}"""
    res, _ = ocr(img)
    found: dict[int, list[int]] = {}
    if not res:
        return found
    for box, text, _score in res:
        t = text.strip()
        # İki biçim: yalnız "17." (ayrı blok) veya "17. Metin..." (birleşik blok).
        # Nokta ZORUNLU: noktasız 3 haneli sayfalar sayfa numarasıdır (216 vb.).
        m = re.fullmatch(r"(\d{1,3})\.", t) or re.match(r"^(\d{1,3})\.\s*\S", t)
        if not m:
            continue
        n = int(m.group(1))
        if 1 <= n <= 566:
            ys = [p[1] for p in box]
            found.setdefault(n, []).append(int(min(ys)))
    return found


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", required=True, help="virgülle madde numaraları")
    ap.add_argument("--out", required=True, help="çıktı adı (.audit/items/<out>.png)")
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--from-leaf", type=int, default=FIRST_LEAF)
    args = ap.parse_args()

    ids = sorted({int(x) for x in args.ids.split(",") if x.strip()})
    os.makedirs(OUT, exist_ok=True)
    ocr = RapidOCR()
    doc = pymupdf.open(PDF)

    # Hedef numaraların hangi leaf'te olduğunu bilmiyoruz → sırayla tara,
    # bulunca o sayfadan kırp ve bir sonraki hedefe geç.
    bands: list[np.ndarray] = []
    remaining = set(ids)
    for leaf in range(args.from_leaf, LAST_LEAF + 1):
        if not remaining:
            break
        img = page_half_png(doc, leaf, args.dpi)
        nums = find_numbers(ocr, img)
        if not (remaining & set(nums)):
            continue
        print(f"leaf {leaf} (kitap s.{leaf - 15}): {sorted(set(nums) & remaining)}")
        scale = args.dpi / 72.0
        for n in sorted(remaining & set(nums)):
            y0 = min(nums[n])
            # madde metni numaradan SONRA gelir; bir sonraki numaraya kadar kırp
            sonraki = min([y for k, v in nums.items() if k > n for y in v] or [img.shape[0] - 1])
            top = max(0, y0 - int(0.012 * scale * 72 / 12))
            bottom = min(img.shape[0], sonraki - int(0.004 * img.shape[0]))
            band = img[top:bottom, :]
            band = cv2.copyMakeBorder(band, 6, 6, 6, 6, cv2.BORDER_CONSTANT, value=(180, 180, 180))
            bands.append(band)
            remaining.discard(n)
    if remaining:
        print("BULUNAMADI:", sorted(remaining), file=sys.stderr)
    CHUNK = 13
    for i in range(0, len(bands), CHUNK):
        part = bands[i:i + CHUNK]
        width = max(b.shape[1] for b in part)
        padded = [cv2.copyMakeBorder(b, 0, 8, 0, max(0, width - b.shape[1]), cv2.BORDER_CONSTANT, value=(255, 255, 255)) for b in part]
        suffix = '' if len(bands) <= CHUNK else f'_{i // CHUNK + 1}'
        out_path = os.path.join(OUT, f"{args.out}{suffix}.png")
        cv2.imwrite(out_path, np.vstack(padded))
        print("yazıldı:", out_path, "| madde sayısı:", len(part))
    return 0 if not remaining else 1


if __name__ == "__main__":
    raise SystemExit(main())
