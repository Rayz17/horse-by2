# Visual & Audio Feedback Rules (The "Juice" System)

To transform a simple merge mechanic into a satisfying "Horse-Verse" experience, we need tiered sensory feedback.

## 1. Merge Feedback Tiers

Different feedback intensity based on the **Rarity** of the resulting character.

| Rarity | Visual Effects (VFX) | Audio (SFX) | Haptic (Vibration) |
|:---|:---|:---|:---|
| **N (Normal)** | **Small Pop**: Tiny dust particles. Tile scales up 1.1x then back. | **Soft Click**: Like a wooden block snapping. | None |
| **R (Rare)** | **Sparkle**: Silver sparkles. Tile flashes white briefly. | **Chime**: A light metallic "ding". | Light Tap (10ms) |
| **SR (Super Rare)** | **Burst**: Gold rays burst outward. Screen shakes slightly (2px). | **Chord**: A major chord synth sound. | Medium Bump (30ms) |
| **SSR (Legend)** | **Explosion**: Full screen shockwave. Background dims. "God Ray" shines on tile. | **Fanfare**: Short orchestral triumph stinger. | Heavy Thud (50ms) |
| **Hidden** | **Glitch/Mystic**: Digital glitch effect or purple smoke. | **Mystery**: A "secret found" sound (e.g., Zelda secret chime). | Double Pulse |

## 2. Boss Encounter Feedback

*   **Warning Phase**:
    *   **Visual**: Screen borders pulse red. Background music fades out.
    *   **Audio**: Low frequency heartbeat sound (thump... thump...).
    *   **UI**: "WARNING" text flashes in center screen.

*   **Boss Spawn**:
    *   **Visual**: Boss sprite slides in from top with a "heavy landing" dust cloud.
    *   **Audio**: Boss specific roar (e.g., Nian = Firecracker explosion sound).
    *   **Music**: Switches to Boss Theme (High tempo).

*   **Boss Hit (Player Merges)**:
    *   **Visual**: Boss sprite flashes red and shakes. Damage number pops up.
    *   **Audio**: Punch/Impact sound.

## 3. Special Event Feedback

*   **Fortune Card (Share)**:
    *   When generating a share card, play a "Stamp" sound effect as the fortune text appears.
    *   Paper rustling sound when the card "unfolds".

*   **Fever Time (Post-Boss)**:
    *   **Visual**: Rainbow border around the grid. Speed lines in background.
    *   **Audio**: Fast-paced, celebratory music loop. Coin collection sounds pitch up with each collection.

## 4. Background Music (BGM) Strategy

*   **Main Loop**: "Festive Lo-Fi". Traditional Chinese instruments (Erhu, Dizi) mixed with chill Lo-Fi beats. Relaxing but upbeat.
*   **Menu/Shop**: "Market Day". Ambient sounds of a busy market + light plucked strings.
*   **Boss Battle**: "Crisis". Heavy drums (Taiko) + fast electronic bassline.

## 5. UI Feedback

*   **Button Press**: Buttons should depress (move down 2px) and play a "wood block" click sound.
*   **Toast Messages**: "Combo x2!", "Critical!" text should pop in with an elastic bounce effect.
