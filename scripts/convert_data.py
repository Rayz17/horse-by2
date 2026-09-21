import re
import json
import os

ROSTER_PATH = "horse-merge-design/02-characters/100-roster-master.md"
LORE_PATH = "horse-merge-design/02-characters/100-lore-stories.md"
OUTPUT_PATH = "frontend/src/data/characters.json"

def parse_roster():
    characters = {}
    with open(ROSTER_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    current_tier = 0
    for line in lines:
        if "Tier 1:" in line: current_tier = 1
        elif "Tier 2:" in line: current_tier = 2
        elif "Tier 3:" in line: current_tier = 3
        elif "Tier 4:" in line: current_tier = 4
        elif "Tier 5:" in line: current_tier = 5
        
        # Match table row: | Lv | 系谱 | 角色名 | ID | 评级 | 描述 |
        # Regex to capture content between pipes
        # Example: | 1 | [A] | **竹马** | `bamboo_horse` | **N** | 骑着竹竿... |
        match = re.search(r"\|\s*(\d+)\s*\|\s*\[([A-D])\]\s*\|\s*\*\*(.*?)\*\*\s*\|\s*`?(.*?)`?\s*\|\s*\*\*(.*?)\*\*\s*\|\s*(.*?)\s*\|", line)
        if match:
            lv = int(match.group(1))
            faction = match.group(2)
            name = match.group(3)
            char_id = match.group(4).replace('`', '').strip()
            rarity = match.group(5)
            desc = match.group(6)
            
            characters[char_id] = {
                "id": char_id,
                "name": name,
                "level": lv,
                "tier": current_tier,
                "faction": faction,
                "rarity": rarity,
                "description": desc,
                # Placeholders for Lore
                "origin": "",
                "background": "",
                "skill": {"name": "", "description": ""},
                "greeting": ""
            }
    return characters

def parse_lore(characters):
    with open(LORE_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Split by character headers "### Lv."
    # Regex lookahead to find blocks
    sections = re.split(r"### Lv\.\d+\s+", content)
    
    for section in sections:
        if not section.strip(): continue
        
        # Extract ID from the first line usually "Name (id)"
        # But split removed the "### Lv.X " part
        # Example section start: "竹马 (bamboo_horse)\n* **出处**..."
        
        lines = section.strip().split('\n')
        header = lines[0]
        
        # Extract ID from header: "Name (id)"
        id_match = re.search(r"\((.*?)\)", header)
        if not id_match: continue
        
        char_id = id_match.group(1).strip()
        
        if char_id not in characters:
            # Try fuzzy match or skip?
            # print(f"Warning: Lore ID {char_id} not in Roster")
            continue
            
        char_data = characters[char_id]
        
        for line in lines:
            if "**出处**:" in line:
                char_data["origin"] = line.split(":", 1)[1].strip()
            elif "**背景**:" in line:
                char_data["background"] = line.split(":", 1)[1].strip()
            elif "**技能" in line:
                # * **技能 [童趣]**: description
                skill_match = re.search(r"技能 \[(.*?)\]:\s*(.*)", line)
                if skill_match:
                    char_data["skill"] = {
                        "name": skill_match.group(1),
                        "description": skill_match.group(2)
                    }
            elif "**新年祝福**:" in line:
                char_data["greeting"] = line.split(":", 1)[1].strip()

    return characters

def main():
    if not os.path.exists(ROSTER_PATH) or not os.path.exists(LORE_PATH):
        print("Design files not found.")
        return

    chars = parse_roster()
    chars = parse_lore(chars)
    
    # Convert dict to list sorted by level
    sorted_chars = sorted(chars.values(), key=lambda x: x["level"])
    
    # Ensure output dir exists
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_chars, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully exported {len(sorted_chars)} characters to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
