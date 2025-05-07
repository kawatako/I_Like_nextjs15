// lib/actions/likeActions.ts
//<FeedLike> コンポーネントから呼び出され、データベースの Like テーブルを操作し、関連する Post または RankingList の likeCount を更新する
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client"; // Prisma Client のパスを確認
import { getUserDbIdByClerkId } from "@/lib/data/userQueries"; // DB ID 取得関数
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type {
  ActionResult,
  PaginatedResponse,
  RankingListSnippet,
  FeedItemWithRelations,
} from "@/lib/types";
import { feedItemPayload } from "@/lib/prisma/payloads"; // payloads からインポート
import { rankingListSnippetSelect } from "@/lib/prisma/payloads"; // payloads.ts からインポート

type LikeRecord = {
  id: string;
  rankingList: RankingListSnippet | null;
};

/**
 * [ACTION] 指定された投稿に「いいね」する
 * @param postId - いいねする対象の Post の ID
 * @returns ActionResult - 成功または失敗情報
 */
export async function likePostAction(postId: string): Promise<ActionResult> {
  // 1. 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  // 2. ユーザーDB ID 取得
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) {
    return { success: false, error: "ユーザー情報が見つかりません。" };
  }

  // 3. postId のチェック
  if (!postId) {
    return { success: false, error: "対象の投稿IDが指定されていません。" };
  }

  console.log(`[LikeAction/Post] User ${userDbId} liking Post ${postId}`);

  try {
    // 4. データベース操作 (トランザクション)
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 既にいいね済みか確認 (冪等性のため)
      const existingLike = await tx.like.findFirst({
        where: { userId: userDbId, postId: postId },
      });

      if (!existingLike) {
        // まだいいねしていなければ実行
        // a. Like レコードを作成
        await tx.like.create({
          data: { userId: userDbId, postId: postId },
        });
        // b. Post の likeCount をインクリメント
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });
        console.log(
          `[LikeAction/Post] Like added and count incremented for Post ${postId}`
        );
      } else {
        console.log(
          `[LikeAction/Post] Post ${postId} already liked by user ${userDbId}.`
        );
      }
    });

    // 5. キャッシュ再検証 (関連パス)
    revalidatePath("/"); // タイムライン
    revalidatePath(`/status/${postId}`); // 投稿詳細ページ (仮)
    // revalidatePath(`/profile/...`); // プロフィール (いいね一覧など)

    return { success: true };
  } catch (error:unknown) {
    console.error(`[LikeAction/Post] Error liking Post ${postId}:`, error);
    // P2002 を直接キャッチしたい場合は any でチェックする
    if (error instanceof Error && (error as any).code === "P2002") {
      return { success: true };
    }
    const message =
      error instanceof Error
        ? error.message
        : "いいね処理中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

/**
 * [ACTION] 指定された投稿の「いいね」を取り消す
 * @param postId - いいねを取り消す対象の Post の ID
 * @returns ActionResult - 成功または失敗情報
 */
export async function unlikePostAction(postId: string): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId)
    return { success: false, error: "ユーザー情報が見つかりません。" };
  if (!postId)
    return { success: false, error: "対象の投稿IDが指定されていません。" };

  console.log(`[UnlikeAction/Post] User ${userDbId} unliking Post ${postId}`);
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // a. Like レコードを削除
      const deletedLike = await tx.like.deleteMany({
        where: { userId: userDbId, postId: postId },
      });

      // b. Post の likeCount をデクリメント (実際に Like が削除された場合のみ)
      if (deletedLike.count > 0) {
        await tx.post.updateMany({
          // updateMany で対象がなくてもエラーにしない & count > 0 も保証
          where: { id: postId, likeCount: { gt: 0 } }, // 念のため 0 より大きいか確認
          data: { likeCount: { decrement: 1 } },
        });
        console.log(
          `[UnlikeAction/Post] Like removed and count decremented for Post ${postId}`
        );
        return true; // 削除実行フラグ
      }
      return false; // 削除されなかった
    });

    if (result) {
      // もし削除が実行された場合
      revalidatePath("/");
      revalidatePath(`/status/${postId}`);
      // revalidatePath(`/profile/...`);
    } else {
      console.log(
        `[UnlikeAction/Post] Like was not found for Post ${postId} by user ${userDbId}.`
      );
    }
    return { success: true }; // Like がなくてもエラーとはしない
  } catch (error:unknown) {
    console.error(`[UnlikeAction/Post] Error unliking Post ${postId}:`, error);
    const message =
      error instanceof Error
        ? error.message
        : "いいね解除中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

/**
 * [ACTION] 指定されたランキングリストに「いいね」する
 * @param rankingListId - いいねする対象の RankingList の ID
 * @returns ActionResult - 成功または失敗情報
 */
export async function likeRankingListAction(
  rankingListId: string
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId)
    return { success: false, error: "ユーザー情報が見つかりません。" };
  if (!rankingListId)
    return { success: false, error: "対象のリストIDが指定されていません。" };

  console.log(
    `[LikeAction/Ranking] User ${userDbId} liking RankingList ${rankingListId}`
  );
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 型注釈の例
      const existingLike = await tx.like.findFirst({
        where: { userId: userDbId, rankingListId: rankingListId },
      });
      if (!existingLike) {
        await tx.like.create({
          data: { userId: userDbId, rankingListId: rankingListId },
        });
        await tx.rankingList.update({
          where: { id: rankingListId },
          data: { likeCount: { increment: 1 } },
        });
        console.log(
          `[LikeAction/Ranking] Like added and count incremented for RankingList ${rankingListId}`
        );
      } else {
        console.log(
          `[LikeAction/Ranking] RankingList ${rankingListId} already liked by user ${userDbId}.`
        );
      }
    });
    revalidatePath("/");
    revalidatePath(`/rankings/${rankingListId}`);
    // revalidatePath(`/profile/...`);
    return { success: true };
  } catch (error:unknown) {
    // P2002 を直接キャッチしたい場合は any でチェックする
    if (error instanceof Error && (error as any).code === "P2002") {
      return { success: true };
    }
    const message =
      error instanceof Error
        ? error.message
        : "いいね処理中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

/**
 * [ACTION] 指定されたランキングリストの「いいね」を取り消す
 * @param rankingListId - いいねを取り消す対象の RankingList の ID
 * @returns ActionResult - 成功または失敗情報
 */
export async function unlikeRankingListAction(
  rankingListId: string
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId)
    return { success: false, error: "ユーザー情報が見つかりません。" };
  if (!rankingListId)
    return { success: false, error: "対象のリストIDが指定されていません。" };

  console.log(
    `[UnlikeAction/Ranking] User ${userDbId} unliking RankingList ${rankingListId}`
  );
  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const deletedLike = await tx.like.deleteMany({
          where: { userId: userDbId, rankingListId: rankingListId },
        });
        if (deletedLike.count > 0) {
          await tx.rankingList.updateMany({
            where: { id: rankingListId, likeCount: { gt: 0 } },
            data: { likeCount: { decrement: 1 } },
          });
          console.log(
            `[UnlikeAction/Ranking] Like removed and count decremented for RankingList ${rankingListId}`
          );
          return true;
        }
        return false;
      }
    );
    if (result) {
      revalidatePath("/");
      revalidatePath(`/rankings/${rankingListId}`);
      // revalidatePath(`/profile/...`);
    } else {
      console.log(
        `[UnlikeAction/Ranking] Like was not found for RankingList ${rankingListId} by user ${userDbId}.`
      );
    }
    return { success: true };
  } catch (error:unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "いいね解除中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

// いいねしたランキングリストをページネーションで取得するアクション
const LIKED_RANKINGS_LIMIT = 20; // 1ページあたりの件数

// ★ 戻り値の型定義
export type LikedRankingResultItem = {
  likeId: string;
  list: RankingListSnippet;
};
export type PaginatedLikedRankingsResponse =
  PaginatedResponse<LikedRankingResultItem>;

/**
 * [SERVER ACTION] 指定されたユーザーがいいねしたランキングリストを取得 (ページネーション)
 * @param targetUserId 対象ユーザーの DB ID
 * @param cursor 前のページの最後の Like レコードの ID (または createdAt?) - Like ID を使うのが確実
 * @returns PaginatedResponse<RankingListSnippet>
 */
export async function getLikedRankingsAction(
  targetUserId: string,
  cursor?: string | null // Like ID をカーソルとして使う
): Promise<PaginatedLikedRankingsResponse> {
  console.log(
    `[Action/getLikedRankings] Fetching liked rankings for user ${targetUserId}, cursor: ${cursor}`
  );
  if (!targetUserId) {
    console.warn("[Action/getLikedRankings] targetUserId is required.");
    return { items: [], nextCursor: null };
  }

  const take = LIKED_RANKINGS_LIMIT + 1;
  const skip = cursor ? 1 : 0;
  const cursorOptions = cursor ? { id: cursor } : undefined;

  try {
    // Like テーブルから条件に合うレコードを取得
    const likes = await prisma.like.findMany({
      where: {
        userId: targetUserId,
        rankingListId: { not: null }, // ランキングリストへのいいねのみ
      },
      select: {
        id: true, // ★ カーソル用に Like の ID を取得 ★
        createdAt: true, // ★ いいねした日時でソート ★
        rankingList: {
          // ★ 関連する RankingList を取得 ★
          select: rankingListSnippetSelect, // ★ Snippet 用 Select を使用 ★
        },
      },
      orderBy: { createdAt: "desc" }, // いいねした日時順
      take: take,
      skip: skip,
      cursor: cursorOptions,
    });

    // 次のカーソル計算 (Like ID を使う)
    let nextCursor: string | null = null;
    if (likes.length > LIKED_RANKINGS_LIMIT) {
      const nextItem = likes.pop();
      if (nextItem) {
        nextCursor = nextItem.id; // 次のページの開始点は Like レコードの ID
      }
    }

    // 結果を RankingListSnippet の配列に変換
    // rankingList が null の可能性も考慮 (DB制約上は起こらないはずだが念のため)
    interface LikeRecord { id: string; rankingList: RankingListSnippet | null }
    const likeRecords: LikeRecord[] = likes;
    const resultItems = likeRecords
      .filter((l): l is LikeRecord & { rankingList: RankingListSnippet } => l.rankingList !== null)
      .map((l) => ({ likeId: l.id, list: l.rankingList }));

    console.log(
      `[Action/getLikedRankings] Found ${resultItems.length} items. Next cursor: ${nextCursor}`
    );
    // ★ 整形したデータを返す ★
    return { items: resultItems, nextCursor };
  } catch (error:unknown) {
    console.error(
      `[Action/getLikedRankings] Error fetching liked rankings for user ${targetUserId}:`,
      error
    );
    return { items: [], nextCursor: null };
  }
}

// 1ページあたりの取得件数
const LIKED_FEED_LIMIT = 20;

export type LikedFeedResultItem = {
  likeId: string; // いいねレコードの ID
  feedItem: FeedItemWithRelations; // 対応する FeedItem データ
};


/**
 * [SERVER ACTION] 指定されたユーザーがいいねした FeedItem を取得 (ページネーション)
 * いいねした日時順 (新しい順) で返す
 * @param targetUserId 対象ユーザーの DB ID
 * @param cursor 前のページの最後の Like レコードの ID
 * @returns PaginatedResponse<FeedItemWithRelations>
 */
export async function getLikedFeedItemsAction(
  targetUserId: string,
  cursor?: string | null
): Promise<PaginatedResponse<LikedFeedResultItem>> {
  if (!targetUserId) {
    return { items: [], nextCursor: null };
  }

  const take = LIKED_FEED_LIMIT + 1;
  const skip = cursor ? 1 : 0;
  const cursorOptions = cursor ? { id: cursor } : undefined;

  // 1. いいねレコードを取得
  type LikeRecord = { id: string; postId: string | null; rankingListId: string | null; createdAt: Date };
  const likes: LikeRecord[] = await prisma.like.findMany({
    where: { userId: targetUserId },
    select: { id: true, postId: true, rankingListId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    cursor: cursorOptions,
  });

  // 2. 次のカーソル
  let nextCursor: string | null = null;
  if (likes.length > LIKED_FEED_LIMIT) {
    const next = likes.pop();
    nextCursor = next ? next.id : null;
  }

  // 3. FeedItem を取得
  const postIds = likes.map((l) => l.postId).filter((id): id is string => !!id);
  const rankingListIds = likes.map((l) => l.rankingListId).filter((id): id is string => !!id);

  const feedItems: FeedItemWithRelations[] = await prisma.feedItem.findMany({
    where: {
      OR: [
        { postId: { in: postIds } },
        { rankingListId: { in: rankingListIds } },
      ],
    },
    select: feedItemPayload.select,
  });

  // 4. ID → FeedItem マップを作成
  const feedItemMap = new Map<string, FeedItemWithRelations>();
  feedItems.forEach((fi) => {
    if (fi.post) {
      feedItemMap.set(fi.post.id, fi);
    } else if (fi.rankingList) {
      feedItemMap.set(fi.rankingList.id, fi);
    }
  });

  // 5. 元の likes 順に並べ替えつつ、{ likeId, feedItem } の配列を作成
  const items: LikedFeedResultItem[] = likes
    .map((l): LikedFeedResultItem | null => {
      const key = l.postId ?? l.rankingListId;
      if (!key) return null;
      const fi = feedItemMap.get(key);
      return fi ? { likeId: l.id, feedItem: fi } : null;
    })
    .filter((x): x is LikedFeedResultItem => x !== null);

  return { items, nextCursor };
}