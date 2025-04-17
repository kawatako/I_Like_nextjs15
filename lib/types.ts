// lib/types.ts
// import type { Post, RankingList } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { feedItemPayload } from "./data/feedQueries";
import { userSnippetSelect } from "./data/userQueries";

//Server Action の汎用的な戻り値の型
export type ActionResult = {
  success: boolean; // 操作が成功したか
  error?: string; // エラーメッセージ (失敗時)
  [key: string]: any; // これで任意の追加プロパティを許容 (より厳密にするなら個別に型定義)
};

//ページネーション API やアクションの共通の戻り値の型
export type PaginatedResponse<T> = {
  items: T[]; // 取得したアイテムの配列
  nextCursor: string | null; // 次のページを取得するためのカーソル
};


export type UserSnippet = Prisma.UserGetPayload<{
  select: typeof userSnippetSelect;
}>;

export type FeedItemWithRelations = Prisma.FeedItemGetPayload<
  typeof feedItemPayload
>;
