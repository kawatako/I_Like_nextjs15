// lib/types.ts
// (必要であれば Prisma の型もインポート)
// import type { Post, RankingList } from "@prisma/client";

/**
 * Server Action の汎用的な戻り値の型
 */
export type ActionResult = {
  success: boolean; // 操作が成功したか
  error?: string;   // エラーメッセージ (失敗時)
  // アクションによっては追加の情報を返す (例: 作成したデータのIDなど)
  [key: string]: any; // これで任意の追加プロパティを許容 (より厳密にするなら個別に型定義)
};

/**
 * ページネーション API やアクションの共通の戻り値の型
 */
export type PaginatedResponse<T> = {
  items: T[];             // 取得したアイテムの配列
  nextCursor: string | null; // 次のページを取得するためのカーソル
};

// 必要であれば他のプロジェクト共通の型をここに追加