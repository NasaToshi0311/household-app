// src/constants/category.ts
// カテゴリの固定順序を定義
export const CATEGORY_ORDER = [
  "食費",
  "外食",
  "日用品",
  "住居・光熱費",
  "交通費",
  "その他",
] as const;

// カテゴリの順序を取得する関数
export function getCategoryOrder(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category as any);
  // 定義されていないカテゴリは最後に配置
  return index === -1 ? CATEGORY_ORDER.length : index;
}

// カテゴリ配列を固定順序でソートする関数
export function sortCategoriesByOrder<T extends { category: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const orderA = getCategoryOrder(a.category);
    const orderB = getCategoryOrder(b.category);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // 同じ順序の場合はカテゴリ名でソート（未定義カテゴリ用）
    return a.category.localeCompare(b.category);
  });
}

