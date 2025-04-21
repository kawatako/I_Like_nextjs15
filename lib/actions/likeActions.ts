// lib/actions/likeActions.ts
//<FeedLike> コンポーネントから呼び出され、データベースの Like テーブルを操作し、関連する Post または RankingList の likeCount を更新する
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client"; // Prisma Client のパスを確認
import { getUserDbIdByClerkId } from "@/lib/data/userQueries"; // DB ID 取得関数
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { ActionResult } from "@/lib/types"; // 共通の ActionResult 型

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
    await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    console.error(`[LikeAction/Post] Error liking Post ${postId}:`, error);
    // P2002 は findFirst で回避しているが念のため
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: true }; // 重複は成功扱い
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
    const result = await prisma.$transaction(async (tx) => {
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
  } catch (error) {
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
  } catch (error) {
    /* ... エラー処理 (P2002含む) ... */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return { success: true };
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
  } catch (error) {
    /* ... エラー処理 ... */
    const message =
      error instanceof Error
        ? error.message
        : "いいね解除中にエラーが発生しました。";
    return { success: false, error: message };
  }
}
