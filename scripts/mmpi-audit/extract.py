#!/usr/bin/env python3
"""MMPI kaynak denetimi — sayfa görüntüsü + OCR yardımcı aracı.

Bu araç, telifli tarama PDF'ini TEK SEFERDE işlemez. Yalnızca açıkça
istenen sayfa aralığını (ve gerekirse yarısını) görsele çevirir ve
OCR metnini git'e GİRMEYEN yerel çalışma alanına (.audit/) yazar.

Kullanım (proje kökünden):

    # sayfa yarımlarını görsele çevir (görsel doğrulama için)
    python3 scripts/mmpi-audit/extract.py render --pages 12-16 --dpi 170

    # OCR metni üret (yalnızca istenen aralık)
    python3 scripts/mmpi-audit/extract.py ocr --pages 12-16 --dpi 200

    # tablo sayfası için yüksek DPI + yalnızca üst/alt yarı
    python3 scripts/mmpi-audit/extract.py render --pages 60 --half right --dpi 300

Çıktılar:
    .audit/pages/pNNN_L.png / pNNN_R.png   (görseller)
    .audit/ocr/pNNN_L.txt / pNNN_R.txt     (OCR metni)

Bağımlılıklar (yorumlanmış ortamda kurulu):
    pip install --break-system-packages pymupdf rapidocr-onnxruntime opencv-python-headless

Not: PDF'deki her tarama sayfası İKİ kitap sayfası içerir (yatay tarama).
Bu yüzden varsayılan mod `--split 2` ile sol/sağ yarı ayrı işlenir.
"""

from __future__ import annotations

import argparse
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF = os.path.join(REPO, "docs", "sources", "mmpi-kitap.pdf")
OUT = os.path.join(REPO, ".audit")


def parse_pages(spec: str) -> list[int]:
    pages: list[int] = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            pages.extend(range(int(a), int(b) + 1))
        else:
            pages.append(int(part))
    return sorted(set(pages))


def halves(clip_rect, half: str):
    """Bir PDF sayfasını sol/sağ kitap sayfasına böler."""
    if half == "full":
        return [("F", clip_rect)]
    w = clip_rect.width
    mid = clip_rect.x0 + w / 2
    if half == "left":
        return [("L", clip_rect.__class__(clip_rect.x0, clip_rect.y0, mid, clip_rect.y1))]
    if half == "right":
        return [("R", clip_rect.__class__(mid, clip_rect.y0, clip_rect.x1, clip_rect.y1))]
    return [
        ("L", clip_rect.__class__(clip_rect.x0, clip_rect.y0, mid, clip_rect.y1)),
        ("R", clip_rect.__class__(mid, clip_rect.y0, clip_rect.x1, clip_rect.y1)),
    ]


def cmd_render(args) -> None:
    import pymupdf

    doc = pymupdf.open(PDF)
    os.makedirs(os.path.join(OUT, "pages"), exist_ok=True)
    for pno in parse_pages(args.pages):
        if pno < 1 or pno > doc.page_count:
            print(f"!! sayfa aralık dışı: {pno}")
            continue
        page = doc[pno - 1]
        for tag, clip in halves(page.rect, args.half):
            pix = page.get_pixmap(dpi=args.dpi, clip=clip)
            path = os.path.join(OUT, "pages", f"p{pno:03d}_{tag}.png")
            pix.save(path)
            print(f"render {pno}{tag} -> {path} ({pix.width}x{pix.height})")


def cmd_ocr(args) -> None:
    import pymupdf
    from rapidocr_onnxruntime import RapidOCR

    engine = RapidOCR()
    doc = pymupdf.open(PDF)
    os.makedirs(os.path.join(OUT, "ocr"), exist_ok=True)
    for pno in parse_pages(args.pages):
        if pno < 1 or pno > doc.page_count:
            print(f"!! sayfa aralık dışı: {pno}")
            continue
        page = doc[pno - 1]
        for tag, clip in halves(page.rect, args.half):
            out_txt = os.path.join(OUT, "ocr", f"p{ pno:03d}_{tag}.txt")
            if os.path.exists(out_txt) and not args.force:
                print(f"skip {pno}{tag} (var)")
                continue
            pix = page.get_pixmap(dpi=args.dpi, clip=clip)
            img_path = os.path.join(OUT, "pages", f"p{pno:03d}_{tag}.png")
            os.makedirs(os.path.dirname(img_path), exist_ok=True)
            pix.save(img_path)
            result, _ = engine(img_path)
            lines = []
            for box, text, score in result or []:
                # OCR belirsizliğini kayda geçir: düşük güvenli satırlar işaretlenir
                flag = "  <LOWCONF>" if score is not None and score < 0.75 else ""
                y = int(sum(p[1] for p in box) / 4)
                lines.append((y, text, flag))
            lines.sort(key=lambda t: t[0])
            with open(out_txt, "w", encoding="utf-8") as fh:
                for y, text, flag in lines:
                    fh.write(f"{text}{flag}\n")
            print(f"ocr {pno}{tag} -> {out_txt} ({len(lines)} satır)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("render", help="sayfaları görsele çevir")
    r.add_argument("--pages", required=True, help="örn. 12-16 veya 12,14,20")
    r.add_argument("--dpi", type=int, default=170)
    r.add_argument("--half", choices=["left", "right", "full", "both"], default="both")
    r.set_defaults(func=cmd_render)

    o = sub.add_parser("ocr", help="sayfaları OCR et (yalnızca istenen aralık)")
    o.add_argument("--pages", required=True)
    o.add_argument("--dpi", type=int, default=200)
    o.add_argument("--half", choices=["left", "right", "full", "both"], default="both")
    o.add_argument("--force", action="store_true", help="DONE sayfaları yeniden işleme")
    o.set_defaults(func=cmd_ocr)

    args = ap.parse_args()
    if not os.path.exists(PDF):
        print(f"Kaynak PDF bulunamadı: {PDF}", file=sys.stderr)
        return 1
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
