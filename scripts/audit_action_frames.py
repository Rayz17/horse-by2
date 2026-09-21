#!/usr/bin/env python3
"""Audit action strip frame 3 for alignment and generate contact sheets."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ACTION_DIR = ROOT / "frontend/public/assets/sprites/characters"
OUT_DIR = ROOT / "docs-archive/action-frame-audit"


def frame_metrics(img: Image.Image) -> tuple[float, float]:
    w, h = img.size
    fw = w // 3
    frames = [img.crop((i * fw, 0, (i + 1) * fw, h)) for i in range(3)]
    centers = []
    heights = []
    for fr in frames:
        bbox = fr.getbbox()
        if not bbox:
            centers.append(fw / 2)
            heights.append(0)
            continue
        cx = (bbox[0] + bbox[2]) / 2
        centers.append(cx)
        heights.append(bbox[3] - bbox[1])
    dx = abs(centers[2] - centers[0]) / fw
    dh = abs(heights[2] - heights[0]) / max(h, 1)
    return dx, dh


def make_contact_sheets(paths: list[Path]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cols, rows = 6, 5
    cell_w, cell_h = 256, 128
    per_sheet = cols * rows
    for sheet_idx in range(0, len(paths), per_sheet):
        chunk = paths[sheet_idx: sheet_idx + per_sheet]
        sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), (32, 32, 48))
        draw = ImageDraw.Draw(sheet)
        for i, path in enumerate(chunk):
            r, c = divmod(i, cols)
            img = Image.open(path).convert("RGBA")
            img.thumbnail((cell_w - 8, cell_h - 24), Image.Resampling.LANCZOS)
            x = c * cell_w + (cell_w - img.width) // 2
            y = r * cell_h + 16
            sheet.paste(img, (x, y), img)
            draw.text((c * cell_w + 4, r * cell_h + 4), path.stem.replace("_action", ""), fill=(255, 255, 255))
        out = OUT_DIR / f"contact_sheet_{sheet_idx // per_sheet + 1}.png"
        sheet.save(out)
        print(f"wrote {out}")


def verify_one(char_id: str) -> int:
    for ext in (".webp", ".png"):
        path = ACTION_DIR / f"{char_id}_action{ext}"
        if path.exists():
            img = Image.open(path)
            dx, dh = frame_metrics(img)
            print(f"{char_id}: dx={dx:.2f} dh={dh:.2f}")
            return 0 if dx <= 0.10 and dh <= 0.20 else 1
    print(f"missing action strip for {char_id}")
    return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify")
    args = parser.parse_args()
    if args.verify:
        return verify_one(args.verify)

    paths = sorted(ACTION_DIR.glob("*_action.png")) + sorted(ACTION_DIR.glob("*_action.webp"))
    if not paths:
        print("no action strips found", file=sys.stderr)
        return 1
    make_contact_sheets(paths)

    misaligned = []
    for path in paths:
        img = Image.open(path)
        dx, dh = frame_metrics(img)
        if dx > 0.18 or dh > 0.30:
            misaligned.append(path.stem)
    list_path = OUT_DIR / "misaligned_list.txt"
    list_path.write_text("\n".join(misaligned) + ("\n" if misaligned else ""))
    print(f"audit complete: {len(paths)} strips, {len(misaligned)} misaligned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
