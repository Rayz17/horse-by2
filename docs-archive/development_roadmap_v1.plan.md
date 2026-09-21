---
name: Horse Merge 2026 Development Roadmap
overview: Comprehensive development plan for the "Horse Merge 2026" web game, based on V3.0 Design. Focuses on a data-driven architecture to handle the 101-character roster, complex synthesis logic, and "Horse-Verse" meta systems.
todos:
  - id: init_project
    content: Initialize Project Structure (Frontend + Backend)
    status: completed
  - id: data_schema
    content: Create `characters.json` and `recipes.json` from Design Docs
    status: completed
  - id: core_grid
    content: Implement Phaser 3 Grid & Drag-Drop Mechanics
    status: completed
  - id: merge_logic
    content: Implement V3 Synthesis Logic (Tier Up + Mutation + Item Recipes)
    status: in_progress
  - id: item_support
    content: Refactor Tile to support Items
    status: pending
  - id: shop_ui
    content: Implement Shop UI & Economy (Gold)
    status: pending
  - id: ui_hud
    content: Implement Main Game HUD (Score, Turn, Boss Bar)
    status: pending
  - id: boss_system
    content: Implement Boss State Machine (Nian, Zhao Gao, Dong Zhuo)
    status: pending
  - id: gallery_system
    content: Implement Gallery with Rarity Effects & Lore
    status: pending
  - id: fortune_card
    content: Implement Social Fortune Card Generation
    status: pending
  - id: audio_visual
    content: Integrate "Juice" (VFX/SFX) based on Rarity
    status: pending
  - id: backend_api
    content: Setup FastAPI for Leaderboard & Static Hosting
    status: pending
isProject: true
---

# Horse Merge 2026 - Development Roadmap (V3.0)

## 1. Technical Architecture

### Frontend (Game Client)
*   **Engine**: **Phaser 3** (Best for 2D sprite management, grid logic, and mobile performance).
*   **Language**: **TypeScript** (Essential for managing complex types like `Character`, `Recipe`, `BossState`).
*   **Build Tool**: **Vite** (Fast development server and bundling).
*   **State Management**: Custom Event Bus (Phaser's built-in events) for decoupling UI from Game Logic.
*   **Asset Management**: Texture Atlas for character sprites (grouped by Tiers to save memory).

### Backend (Server)
*   **Framework**: **Python FastAPI** (Lightweight, fast, easy to deploy on Windows).
*   **Database**: **SQLite** (Simple, file-based, sufficient for a single-server leaderboard).
*   **Deployment**: **Windows Server** (Using Uvicorn/Gunicorn behind Nginx or IIS reverse proxy).

### Data-Driven Design
*   **`characters.json`**: The "Source of Truth". Contains ID, Name, Tier, Faction, Rarity, Lore, Skill Data.
*   **`recipes.json`**: Defines all synthesis rules (Standard, Mutation, Item-based).
*   **`items.json`**: Defines items available in Shop or as drops.
*   **`bosses.json`**: Defines Boss stats, triggers, and dialogue lines.

---

## 2. Development Phases

### Phase 1: Foundation & Data (Completed)
*   **Goal**: A playable grid where "Placeholder Squares" can be merged according to the V3.0 logic.
*   **Status**:
    1.  **Project Setup**: Initialize Git, Vite + Phaser, FastAPI. [x]
    2.  **Data Migration**: Convert `100-roster-master.md` and `synthesis-graph.md` into structured JSON files. [x]
    3.  **Grid System**: Create the 8x8 dynamic grid (rendering, input handling). [x]
    4.  **Basic Merge**: Implement `A + A = B` logic. [x]

### Phase 2: Core Gameplay Loop (In Progress)
*   **Goal**: The full game loop with Items, Mutations, and Skills.
*   **Tasks**:
    1.  **Refactor Tile**: Support both `Character` and `Item` types on grid.
    2.  **Advanced Merge**: Implement "Mutation" (A+B) and "Recipe" (A+Item) logic.
    3.  **Economy**: Gold tracking and Shop UI.
    4.  **Item System**: Buy items from shop and spawn them on the grid.
    5.  **Skill System**: Implement passive buffs (e.g., Bamboo Horse's coin gen) and active skills.

### Phase 3: The "Horse-Verse" Meta (Next)
*   **Goal**: Boss battles, Gallery, and Visual Polish.
*   **Tasks**:
    1.  **Boss Engine**: Boss spawn logic, turn-based attacks, HP bars, and "Counter" logic (e.g., Firecracker vs Nian).
    2.  **Gallery UI**: The "Pokedex". Rarity frames (N/R/SR/SSR), Lore display, New Year Greetings.
    3.  **Visual Polish**: Implement the `visual-audio-feedback.md` rules (Screen shake, particles).

### Phase 4: Social & Deployment
*   **Goal**: Viral features and Server Launch.
*   **Tasks**:
    1.  **Fortune Card**: Logic to capture game state -> generate a shareable image (Canvas API).
    2.  **Audio**: BGM and SFX implementation.
    3.  **Backend**: Leaderboard API, Daily Sign-in logic.
    4.  **Deployment**: Configure Windows Server, set up production build.

---

## 3. Asset Pipeline Strategy (Immediate Action)
*   **User Action**: While I code Phase 1, you will generate assets using `full-roster-prompts.md`.
*   **Naming Convention**: Save files as `{id}.png` (e.g., `bamboo_horse.png`, `elon_mars.png`).
*   **Resolution**: Generate at 512x512, we will resize to 128x128 for the game grid.
