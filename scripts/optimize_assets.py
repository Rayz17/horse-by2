#!/usr/bin/env python3
"""Compress and convert frontend/public/assets PNGs to WebP."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend/public/assets"
BACKUP = ROOT / "frontend/raw_assets_backup"

RULES: list[tuple[str, int | None, int | None]] = [
    ("sprites/characters/*_action.png", None, 256),
    ("sprites/characters/great_harmony_*.png", 1024, None),
    ("sprites/characters/*.png", 512, None),
    ("sprites/items/*.png", 256, None),
    ("ui/icon_*.png", 192, None),
    ("ui/border_*.png", 512, None),
    ("ui/ui_slot_frame.png", 512, None),
    ("ui/bg_main_menu.png", 1440, None),
    ("ui/bg_game_grid.png", 1024, None),
    ("ui/ui_info_panel.png", 1024, None),
    ("ui/ui_inventory_bg.png", 1024, None),
    ("ui/ui_shop_bg.png", 1024, None),
    ("ui/chapter_banner_tier.png", 1024, None),
    ("ui/boss_briefing_panel.png", 1024, None),
    ("ui/harmony_progress_panel.png", 1024, None),
    ("ui/ending_choice_card.png", 1024, None),
    ("ui/unlock_harmony_badge.png", 1024, None),
    ("ui/bg_gallery.png", 1440, None),
    ("ui/top_bar_bg.png", 1024, None),
    ("ui/ui_panel_9slice.png", 512, None),
    ("ui/btn_generic.png", 384, None),
]


def match_rule(path: Path) -> tuple[int | None, int | None]:
    rel = path.relative_to(ASSETS).as_posix()
    for pattern, max_side, max_height in RULES:
        pat = pattern.replace("**/", "")
        if pat.startswith("sprites/characters/great_harmony_") and rel.startswith("sprites/characters/great_harmony_") and rel.endswith(".png"):
            return max_side, max_height
        if pat.startswith("sprites/characters/*_action") and rel.startswith("sprites/characters/") and rel.endswith("_action.png"):
            return max_side, max_height
        if pat == "sprites/characters/*.png" and rel.startswith("sprites/characters/") and rel.endswith(".png") and "_action" not in rel and "great_harmony_" not in rel:
            return max_side, max_height
        if pat.endswith("*.png"):
            prefix = pat[:-len("*.png")]
            if rel.startswith(prefix) and rel.endswith(".png"):
                return max_side, max_height
        elif rel == pat:
            return max_side, max_height
    return None, None


def resize_image(img: Image.Image, max_side: int | None, max_height: int | None) -> Image.Image:
    w, h = img.size
    if max_height and not max_side:
        if h <= max_height:
            return img
        nw = int(w * max_height / h)
        return img.resize((nw, max_height), Image.Resampling.LANCZOS)
    if max_side:
        longest = max(w, h)
        if longest <= max_side:
            return img
        scale = max_side / longest
        return img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return img


def process_file(path: Path) -> bool:
    if path.suffix.lower() == ".webp":
        return False
    if path.suffix.lower() != ".png":
        return False
    max_side, max_height = match_rule(path)
    if max_side is None and max_height is None:
        return False

    backup_path = BACKUP / path.relative_to(ASSETS)
    if not backup_path.exists():
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup_path)

    img = Image.open(path).convert("RGBA")
    img = resize_image(img, max_side, max_height)
    webp_path = path.with_suffix(".webp")
    img.save(webp_path, "WEBP", quality=82, method=6)
    path.unlink(missing_ok=True)
    print(f"optimized: {path.relative_to(ASSETS)} -> {webp_path.name}")
    return True


def main() -> None:
    count = 0
    for path in sorted(ASSETS.rglob("*.png")):
        if process_file(path):
            count += 1
    print(f"optimize_assets: converted {count} files")


if __name__ == "__main__":
    main()
