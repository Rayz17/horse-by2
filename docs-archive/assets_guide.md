# Art Asset Generation Guide (V3.1)

This guide details the required art assets for "Horse Merge 2026". All assets should be generated using **Nano Banana** (or similar AI tools) following the prompts below.

## 1. Directory Structure

Place generated files in the following directories within `frontend/public/assets/`:

*   `sprites/characters/`: Character icons.
*   `sprites/items/`: Item icons.
*   `ui/`: UI elements (backgrounds, buttons).
*   `vfx/`: Visual effects.

## 2. Character Assets (`sprites/characters/`)

*   **Resolution**: Generate at **512x512** or **256x256**. The game will resize them to fit the grid (approx 80x80).
*   **Format**: PNG with **Transparent Background**.
*   **Style**: `isometric view, 2.5d pixel art, 16-bit style, vibrant festive colors, clean bold outlines, white background (remove background after generation)`

### File Naming
The filename MUST match the `id` in `characters.json`.

**CRITICAL**: Do NOT use the simplified descriptions below for generation. 
**REFER TO** `horse-merge-design/03-art-prompts/full-roster-prompts.md` for the **Master Prompt List (V3.2)**.

This master list now includes:
1.  **Base Prompts**: High-fidelity static sprites.
2.  **Idle Prompts**: For breathing/movement animations (2-4 frames).
3.  **Action Prompts**: For attack/skill casting animations.

**Action**: Open `horse-merge-design/03-art-prompts/full-roster-prompts.md`, copy the prompts for each state (Base/Idle/Action), generate in Nano Banana, and save as:
*   `{id}.png` (Base)
*   `{id}_idle.png` (Idle strip or frame)
*   `{id}_action.png` (Action frame)

## 3. Item Assets (`sprites/items/`)

*   **Resolution**: 256x256.
*   **Format**: PNG (Transparent).
*   **Style**: Same pixel art style.

**Detailed Prompts**: Refer to Section 2 of `horse-merge-design/03-art-prompts/full-roster-prompts.md`.

| ID | Name |
|:---|:---|
| `item_cannon` | 大炮 |
| `item_tiger` | 老虎玩偶 |
| ... | ... |

## 4. UI Assets (`ui/`)

*   **Resolution**: Varied.
*   **Format**: PNG.

| Filename | Description | Size |
|:---|:---|:---|
| `bg_grid.png` | Background for the 8x8 grid area. Light beige/paper texture. | 700x700 |
| `panel_info.png` | Background for the Info Panel. Dark semi-transparent rect. | 700x200 |
| `btn_skill.png` | Button background for "Use Skill". Green/Gold. | 200x80 |
| `btn_shop.png` | Background for shop items. | 120x140 |

## 5. VFX Assets (`vfx/`)

*   **Format**: PNG (Sprite Sheet or Single Particle).

| Filename | Description |
|:---|:---|
| `particle_star.png` | A simple white/gold star shape for merge effects. |
| `particle_smoke.png` | A white puff cloud for spawn effects. |
| `particle_sparkle.png` | A cross-shaped sparkle. |

---

**Note**: For now, the code uses placeholders. Once you generate these files, simply drop them into the respective folders, and the game will automatically load them (after we update the `Preloader.ts` to scan these folders or load a manifest).
