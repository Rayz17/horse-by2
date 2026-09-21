import json
import re
import os

# Paths
LORE_PATH = '../horse-merge-design/02-characters/100-lore-stories.md'
JSON_PATH = 'src/data/characters.json'
PUBLIC_JSON_PATH = 'public/assets/data/characters.json'

# Archetype Keywords Mapping
ARCHETYPES = {
    'arch_economy': ['金币', '招财', '补给', '掉落', '雇佣', '巡游', '贵气', '吃瓜', '童趣'],
    'arch_clear_low': ['消除', '吞食', '吓跑', '清场'],
    'arch_snipe': ['伤害', '狙击', '炮', '射手', '斩', '攻击', '必杀', '精准', '米加粒子炮', '铁球', '暗影球'],
    'arch_bomb': ['爆炸', '轰炸', '范围', '震慑', '击退', '风沙', '全弹发射', '音爆'],
    'arch_transform': ['变身', '变形', '伪装', '随机', '指鹿为马', '混淆'],
    'arch_freeze': ['冻结', '定住', '眩晕', '停止', '拍照', '石化', '威慑'],
    'arch_shuffle': ['交换', '排列', '捣乱', '随机位置', '重组'],
    'arch_heal': ['净化', '治疗', '回血', '解除', '免疫', '安魂曲', '打岔', '福祸相依'],
    'arch_upgrade': ['升级', '进阶', '飞升', '进化', '鼓舞', '孤勇'],
    'arch_summon': ['生成', '召唤', '产出', '伏兵', '绘物']
}

# Explicit Signature Skills
SIGNATURES = {
    'auntie_ma': 'sig_dacha',
    'cow_horse': 'sig_jiaban',
    'coder_feng': 'sig_debug',
    'magic_paint': 'sig_huiwu',
    'tech_giants': 'sig_ecosystem',
    'elon_mars': 'sig_tothemoon'
}

def parse_lore():
    with open(LORE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find characters and their skills
    # Format: ### Lv.X Name (id)\n...* **技能 [SkillName]**: Description
    # Note: Added \s* to handle potential whitespace before the asterisk and other elements
    char_pattern = re.compile(r'### Lv\.(\d+) .*?\((.*?)\).*?\*\s*\*\*技能\s*\[(.*?)\]\*\*\:\s*(.*?)\n', re.DOTALL)
    
    skills = {}
    for match in char_pattern.finditer(content):
        level = int(match.group(1))
        char_id = match.group(2)
        skill_name = match.group(3)
        skill_desc = match.group(4).strip()
        
        skills[char_id] = {
            'name': skill_name,
            'description': skill_desc
        }
    return skills

def determine_archetype(char_id, skill_info):
    if char_id in SIGNATURES:
        return SIGNATURES[char_id]
    
    name = skill_info['name']
    desc = skill_info['description']
    text = name + " " + desc
    
    # Priority check
    for arch, keywords in ARCHETYPES.items():
        for kw in keywords:
            if kw in text:
                return arch
    
    return 'arch_snipe' # Default fallback

def update_json():
    lore_skills = parse_lore()
    
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for char in data:
        char_id = char['id']
        if char_id in lore_skills:
            skill_info = lore_skills[char_id]
            archetype = determine_archetype(char_id, skill_info)
            
            char['skill'] = {
                'name': skill_info['name'],
                'description': skill_info['description'],
                'type': archetype,
                'params': {} # Can be populated later or dynamically in game
            }
            
            # Simple param logic based on level
            level = char['level']
            if archetype == 'arch_economy':
                char['skill']['params'] = {'amount': level * 10}
            elif archetype == 'arch_snipe':
                char['skill']['params'] = {'damage': level * 50}
            elif archetype == 'arch_bomb':
                char['skill']['params'] = {'radius': 1}
            
    # Save src
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    # Save public
    with open(PUBLIC_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    print(f"Updated {len(data)} characters with skills.")

if __name__ == "__main__":
    update_json()
