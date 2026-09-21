import json
import os

OUTPUT_DIR = "frontend/src/data"

def create_items():
    items = [
        {"id": "item_cannon", "name": "大炮", "icon": "💣", "price": 200, "description": "合成 [马后炮] 或炸毁单位"},
        {"id": "item_tiger", "name": "老虎玩偶", "icon": "🐯", "price": 500, "description": "合成 [马马虎虎]"},
        {"id": "item_deer_sign", "name": "鹿牌", "icon": "🦌", "price": 50, "description": "将 [鹿] 转化为 [指鹿为马]"},
        {"id": "item_brush", "name": "神笔", "icon": "🖌️", "price": 800, "description": "合成 [神笔马良]"},
        {"id": "item_plum", "name": "青梅", "icon": "🍈", "price": 100, "description": "与 [竹马] 合成 [伯乐相马]"},
        {"id": "item_gold_ingot", "name": "金元宝", "icon": "💰", "price": 0, "description": "吞噬获得金币"},
        {"id": "item_monkey", "name": "猴子", "icon": "🐵", "price": 0, "description": "吞噬获得 [马上封侯]"},
        {"id": "item_refresh", "name": "刷新券", "icon": "🔄", "price": 50, "description": "刷新商店"}
    ]
    return items

def create_recipes():
    recipes = [
        # Item Catalyst Recipes
        {
            "type": "catalyst",
            "ingredients": ["any_horse", "item_cannon"],
            "result": "cannon_back",
            "desc": "马后炮"
        },
        {
            "type": "catalyst",
            "ingredients": ["any_horse", "item_tiger"],
            "result": "tiger_patch",
            "desc": "马马虎虎"
        },
        {
            "type": "catalyst",
            "ingredients": ["deer_unit", "item_deer_sign"], # deer_unit is Lv.0
            "result": "deer_sign",
            "desc": "指鹿为马"
        },
        {
            "type": "catalyst",
            "ingredients": ["any_horse", "item_brush"],
            "result": "magic_paint",
            "desc": "神笔马良"
        },
        {
            "type": "catalyst",
            "ingredients": ["bamboo_horse", "item_plum"],
            "result": "bole_sage",
            "desc": "青梅竹马 -> 伯乐相马"
        },
        
        # Mutation Recipes
        {
            "type": "mutation",
            "ingredients": ["god_of_war", "rock_horse"], # Guan Yu + Robot
            "result": "elon_mars", # Lv.100
            "desc": "赤兔 + 机械 = 马一龙"
        },
        {
            "type": "mutation",
            "ingredients": ["god_of_war", "orange_mecha"], # Alternative mechanical
            "result": "elon_mars", 
            "desc": "赤兔 + 机甲 = 马一龙"
        }
        # Add more specific mutations if defined later
    ]
    return recipes

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    items = create_items()
    with open(os.path.join(OUTPUT_DIR, "items.json"), "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
        
    recipes = create_recipes()
    with open(os.path.join(OUTPUT_DIR, "recipes.json"), "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
        
    print("Items and Recipes created.")

if __name__ == "__main__":
    main()
