//lib/utils/cn.ts
// ClassValue[]:string や undefined／false、ネストした配列、オブジェクト（キーをクラス名、値を boolean）など、clsx が受け取れるあらゆる形式をまとめて扱える
// clsx(inputs):受け取った inputs をフラットにして、"foo bar" のような単純な文字列にまとめる
import { type ClassValue, clsx } from "clsx"
//twMerge(...):Tailwind のユーティリティクラス名が重複したときに、後ろにある方だけを残してれます（"px-2 px-4" → "px-4" など）。
//これがないと clsx のみだと重複したユーティリティがそのまま出力されてしまう
import { twMerge } from "tailwind-merge"

// uiの定義で使う
// clsx で真偽値や配列・オブジェクトを含む class 値をまとめ、twMerge で Tailwind クラスの重複をマージ
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

