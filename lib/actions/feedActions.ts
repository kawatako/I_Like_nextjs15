// lib/actions/feedActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { getUserDbIdByClerkId } from '@/lib/data/userQueries';
import { getHomeFeed, FeedItemWithRelations} from '@/lib/data/feedQueries'; // getHomeFeed と型をインポート
import { PaginatedResponse } from "@/lib/types"; // PaginatedResponse 型をインポート

// 無限スクロールで一度に読み込む件数
const INFINITE_SCROLL_LIMIT = 20;

/**
 * ホームタイムラインの追加データを取得する Server Action
 * @param cursor - 前のページの最後の FeedItem の ID (null の場合は最初のページ相当だが、通常は TimelineFeed から非 null で渡される想定)
 * @returns PaginatedResponse<FeedItemWithRelations> - 次のアイテムリストと次のカーソル
 */
export async function loadMoreFeedItemsAction(
  cursor: string | null // カーソルを受け取る
): Promise<PaginatedResponse<FeedItemWithRelations>> { // getHomeFeed と同じ型を返す
  // 1. 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    console.warn("[loadMoreFeedItemsAction] User not authenticated.");
    // ログインしていない場合は空の結果を返す
    return { items: [], nextCursor: null };
  }

  // 2. DBユーザーIDを取得
  let userDbId: string | null = null;
  try {
    userDbId = await getUserDbIdByClerkId(clerkId);
    if (!userDbId) {
      console.warn(`[loadMoreFeedItemsAction] User with clerkId ${clerkId} not found in DB.`);
      return { items: [], nextCursor: null };
    }
  } catch (error) {
    console.error("[loadMoreFeedItemsAction] Error fetching user DB ID:", error);
    return { items: [], nextCursor: null };
  }

  // 3. getHomeFeed を呼び出して次のデータを取得
  try {
    // cursor が null または undefined の場合に getHomeFeed がどう動作するか確認が必要
    // getHomeFeed の実装が cursor: undefined で最初のページを返すならこのままでOK
    const result = await getHomeFeed({
      userId: userDbId,
      limit: INFINITE_SCROLL_LIMIT,
      cursor: cursor ?? undefined, // null の場合は undefined を渡す
    });
    console.log(`[loadMoreFeedItemsAction] Fetched ${result.items.length} items, next cursor: ${result.nextCursor}`);
    return result; // 取得したデータと次のカーソルをそのまま返す

  } catch (error) {
    console.error("[loadMoreFeedItemsAction] Error calling getHomeFeed:", error);
    // エラー発生時も空の結果を返す
    return { items: [], nextCursor: null };
  }
}