// components/DateText.tsx
// utc表示から日本時間にする
import React from "react";
import { formatDateToJST } from "@/lib/utils/date";

export function DateText({ date }: { date: string | Date }) {
  return <>{formatDateToJST(date)}</>;
}
