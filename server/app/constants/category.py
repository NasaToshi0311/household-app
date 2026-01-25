# app/constants/category.py
# カテゴリの固定順序を定義
CATEGORY_ORDER = [
    "食費",
    "外食",
    "日用品",
    "住居・光熱費",
    "交通費",
    "その他",
]


def get_category_order(category: str) -> int:
    """カテゴリの順序を取得する関数"""
    try:
        return CATEGORY_ORDER.index(category)
    except ValueError:
        # 定義されていないカテゴリは最後に配置
        return len(CATEGORY_ORDER)


def sort_categories_by_order(items: list) -> list:
    """カテゴリ配列を固定順序でソートする関数"""
    return sorted(items, key=lambda x: (get_category_order(x.category if hasattr(x, 'category') else x[0]), x.category if hasattr(x, 'category') else x[0]))

