import json
import os

OUTPUT_DIR = "frontend/src/data"

def create_bosses():
    bosses = [
        {
            "id": "nian",
            "name": "年兽",
            "hp": 1000,
            "maxHp": 1000,
            "triggers": {"type": "turn", "values": [20, 40, 60]},
            "weakness": ["cannon_back", "fire_mane", "god_of_war", "item_cannon"],
            "dialogue": {
                "spawn": "嗷呜！饿了！吃马！",
                "skill": "不许动！都给我冻住！",
                "hit": "痛！皮厚不怕！",
                "weakness_hit": "哇啊啊！太响了！耳朵要聋了！",
                "defeat": "明年...我还会回来的！"
            },
            "skill": {
                "id": "freeze",
                "name": "恐吓",
                "desc": "随机冻结 3 个格子"
            }
        },
        {
            "id": "zhao_gao",
            "name": "赵高",
            "hp": 2000,
            "maxHp": 2000,
            "triggers": {"type": "condition", "desc": "连续3次合成失败 或 空位<5"},
            "weakness": ["deer_sign", "fake_dragon"],
            "dialogue": {
                "spawn": "我看这满朝文武，谁敢不服？",
                "skill": "这明明是鹿，陛下您看错了吧？",
                "hit": "大胆！竟敢伤我！",
                "weakness_hit": "你...你竟然用我的魔法对付我！",
                "defeat": "不可能...这绝对不可能..."
            },
            "skill": {
                "id": "transform_deer",
                "name": "指鹿为马",
                "desc": "将最高级马变成 [鹿]"
            }
        },
        {
            "id": "dong_zhuo",
            "name": "董卓",
            "hp": 5000,
            "maxHp": 5000,
            "triggers": {"type": "condition", "desc": "金币 > 5000"},
            "weakness": ["dark_prince", "item_beauty_trap", "sky_concept"], # sky_concept is Lv.97 (Lu Bu equivalent in power/rarity for now?) actually boss-mechanics says Lv.97
            "dialogue": {
                "spawn": "哈哈哈！这里的金子，都是咱家的！",
                "skill": "拿来吧你！充公！充公！",
                "hit": "哎育...",
                "weakness_hit": "哎呀...这小模样...咱家心都化了...",
                "defeat": "吾儿奉先何在？！"
            },
            "skill": {
                "id": "steal_gold",
                "name": "暴敛",
                "desc": "偷取 10% 金币"
            }
        }
    ]
    return bosses

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    bosses = create_bosses()
    with open(os.path.join(OUTPUT_DIR, "bosses.json"), "w", encoding="utf-8") as f:
        json.dump(bosses, f, indent=2, ensure_ascii=False)
        
    print("Boss data created.")

if __name__ == "__main__":
    main()
