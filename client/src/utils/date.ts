/**
 * 日付をYYYY-MM-DD形式の文字列に変換（ローカルタイムゾーン）
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 指定月の開始日を取得
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 指定月の終了日を取得
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * 直近Nか月の開始日と終了日を計算
 * @param months 取得する月数（デフォルト: 2）
 * @returns { start: string, end: string } YYYY-MM-DD形式の日付文字列
 */
export function getRecentMonthsRange(months: number = 2): { start: string; end: string } {
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // (N-1)か月前の1日を計算（例: 3月15日で2か月前 → 2月1日）
  const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  
  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
}

/**
 * Nか月前の1日を取得
 */
export function getMonthsAgoDate(months: number): string {
  const today = new Date();
  const monthsAgo = new Date(today.getFullYear(), today.getMonth() - months, 1);
  return formatDate(monthsAgo);
}

