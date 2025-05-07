// lib/types.ts
import type { Prisma, User, Post, RankingList, FeedItem } from "@prisma/client";
// --- 共通のペイロード/セレクト定義をインポート ---
import {
  userSnippetSelect,
  feedItemPayload,
  userProfilePayload,
  postPayload,
  rankingListSnippetSelect,
  rankingListViewSelect,
  rankingListEditSelect,
} from "@/lib/prisma/payloads";
// --- 汎用型定義 ---

/**
 * Server Action の汎用的な戻り値の型。
 * 操作の成功/失敗、エラーメッセージ、およびアクション固有の追加データを含む。
 */
export type ActionResult = {
  success: boolean;
  error?: string;
  [key: string]: any; // 例: { success: true, newListId: '...' }
};

/**
 * ページネーション（無限スクロールなど）で使われる共通のレスポンス形式。
 * @template T 取得するアイテムの型
 */
export type PaginatedResponse<T> = {
  items: T[]; // 取得したアイテムの配列
  nextCursor: string | null; // 次のページを取得するためのカーソル (なければ null)
};

// --- ユーザー関連の型定義 ---

/**
 * ユーザーの基本的な情報（スニペット）。
 * アバター、名前、ユーザー名など、多くの場所で簡易的にユーザーを表示するために使用。
 * （由来: lib/data/userQueries.ts の userSnippetSelect - { id, username, name, image }）
 */
export type UserSnippet = Prisma.UserGetPayload<{
  select: typeof userSnippetSelect;
}>;

/**
 * プロフィールページで表示するための、ユーザーとその関連情報（公開ランキングリスト、フォロワー/フォロー数など）を含むデータ型。
 * （由来: lib/data/userQueries.ts の userProfilePayload - { id, clerkId, username, ..., rankingLists (一部), _count{following, followedBy} }）
 */
export type UserProfileData = Prisma.UserGetPayload<typeof userProfilePayload>;

// --- 投稿 (Post) 関連の型定義 ---

/**
 * 投稿とその関連情報（作者、いいね数/状態、リプライ数）を含むデータ型。
 * タイムラインカード、投稿詳細、プロフィール投稿リストなどで使用。
 * （由来: lib/data/postQueries.ts の postPayload - { id, content, createdAt, author(snippet), likes, likeCount, _count{replies} }）
 */
export type PostWithData = Prisma.PostGetPayload<typeof postPayload>;

// --- ランキングリスト (RankingList) 関連の型定義 ---

/**
 * ランキングリストの概要情報（スニペット）。
 * プロフィールページやタイムラインカードでのプレビュー表示用。アイテムリストは一部のみ含む。いいね情報も含む。
 * （由来: lib/data/rankingQueries.ts の rankingListSnippetSelect - { id, subject, items(top3), likes, likeCount, _count{items}, ... }）
 */
export type RankingListSnippet = Prisma.RankingListGetPayload<{
  select: typeof rankingListSnippetSelect;
}>;

// 詳細表示用データの型
export type RankingListViewData = Prisma.RankingListGetPayload<{
  select: typeof rankingListViewSelect;
}>;

/** ランキング編集ページ用のデータ型 */
export type RankingListEditableData = Prisma.RankingListGetPayload<{
  select: typeof rankingListEditSelect; // ★ rankingQueries からインポート ★
}>;

// --- タイムライン項目 (FeedItem) 関連の型定義 ---

/**
 * タイムラインに表示する FeedItem とその関連情報（ユーザー、投稿、ランキング、リツイート元、引用元、各種カウントなど）をすべて含む型。
 * getHomeFeed 関数や FeedItem 詳細ページなどで使用。
 * （由来: lib/data/feedQueries.ts の feedItemPayload - { id, type, user, post(with likes), rankingList(with likes), retweetOfFeedItem(nested), quotedFeedItem(nested), _count{retweets}, quoteRetweetCount, ... }）
 */
export type FeedItemWithRelations = Prisma.FeedItemGetPayload<
  typeof feedItemPayload
>;

// --- トレンド関連の型定義 ---