// lib/utils/date.ts
import { format, toZonedTime } from "date-fns-tz";

// 表示フォーマット。好みで書式は変えてください。
const DATE_FORMAT = "yyyy/MM/dd HH:mm:ss";
const TIME_ZONE = "Asia/Tokyo";

/**
 * ISO 文字列 or Date オブジェクトを受け取り、
 * Asia/Tokyo のタイムゾーンでフォーマットされた文字列を返す。
 */
export function formatDateToJST(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // UTC→Asia/Tokyo に変換
  const zoned = toZonedTime(d, TIME_ZONE);
  return format(zoned, DATE_FORMAT, { timeZone: TIME_ZONE });
}
