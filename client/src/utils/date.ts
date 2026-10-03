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
 * 今日の日付（ローカルタイムゾーン）をYYYY-MM-DD形式で取得
 * ※ toISOString() はUTCになるため、日本時間の0〜9時に前日の日付になってしまう
 */
export function todayStr(): string {
  return formatDate(new Date());
}

/**
 * YYYY-MM-DD形式の日付にN日加算した日付を返す
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return formatDate(new Date(y, m - 1, d + days));
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
 * 月の範囲（YYYY-MM-DD）を取得。offsetで前後の月にずらせる
 */
export function monthRange(base: Date, offset: number = 0): { start: string; end: string } {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return { start: formatDate(startOfMonth(d)), end: formatDate(endOfMonth(d)) };
}

/**
 * YYYY-MM-DD を「10/3(金)」形式に変換
 */
export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${wd})`;
}

/**
 * ISO日時を「10/3 12:34」形式に変換
 */
export function formatDateTimeLabel(iso: string): string {
  const dt = new Date(iso);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${dt.getMonth() + 1}/${dt.getDate()} ${hh}:${mm}`;
}
