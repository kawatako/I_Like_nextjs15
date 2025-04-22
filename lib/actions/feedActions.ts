// lib/actions/feedActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getHomeFeed } from "@/lib/data/feedQueries";
import { FeedItemWithRelations } from "@/lib/types";
import { PaginatedResponse } from "@/lib/types";
import { ActionResult } from "@/lib/types";
import { FeedType, Prisma, Post, FeedItem } from "@prisma/client";
import { revalidatePath } from "next/cache";

// 無限スクロールで一度に読み込む件数
const TIMELINE_PAGE_LIMIT = 20;
/**
 * [SERVER ACTION] ログインユーザーのホームタイムラインを取得 (ページネーション対応)
 * useSWRInfinite の fetcher から呼び出されることを想定
 * @param cursor - 前のページの最後の FeedItem の ID (最初のページは undefined)
 * @returns PaginatedResponse<FeedItemWithRelations> - アイテムリストと次のカーソル
 */
export async function getPaginatedFeedItemsAction(
  cursor?: string // ★ 引数をカーソルのみに変更 ★
): Promise<PaginatedResponse<FeedItemWithRelations>> {

  console.log(`[Action/getPaginatedFeedItems] Fetching page with cursor: ${cursor}`);

  // 1. 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) { /* ... */ return { items: [], nextCursor: null }; }

  // 2. DBユーザーID取得
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) { /* ... */ return { items: [], nextCursor: null }; }

  try {
    // 4. 既存のデータ取得関数を呼び出す
    const result = await getHomeFeed({
      userId: userDbId,
      limit: TIMELINE_PAGE_LIMIT,
      cursor: cursor
    });
    return result; // { items, nextCursor } を返す
  } catch (error) {
    console.error("[Action/getPaginatedFeedItems] Error calling getHomeFeed:", error);
    // エラー時は空の結果を返す (またはエラーを示すオブジェクトを返す)
    return { items: [], nextCursor: null };
  }
}

//指定された FeedItem へのリツイートを行う Server Action
export async function retweetAction(feedItemId: string): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) {
    return { success: false, error: "ユーザー情報が見つかりません。" };
  }
  if (!feedItemId) {
    return { success: false, error: "リツイート対象が指定されていません。" };
  }

  console.log(
    `[RetweetAction] User ${userDbId} attempting to retweet FeedItem ${feedItemId}`
  );

  try {
    const originalFeedItem = await prisma.feedItem.findUnique({
      // ★ prisma が使える ★
      where: { id: feedItemId },
      select: {
        userId: true,
        type: true,
        user: { select: { isPrivate: true } },
      },
    });
    if (!originalFeedItem) {
      throw new Error("リツイート対象の投稿が見つかりません。");
    }
    if (originalFeedItem.user?.isPrivate) {
      throw new Error("非公開アカウントの投稿はリツイートできません。");
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existingRetweet = await tx.retweet.findUnique({
          where: {
            userId_feedItemId: { userId: userDbId, feedItemId: feedItemId },
          },
          select: { id: true },
        });
        if (existingRetweet) {
          console.log(`[RetweetAction] Already retweeted.`);
          return { alreadyRetweeted: true };
        }
        await tx.retweet.create({
          data: { userId: userDbId, feedItemId: feedItemId },
        });
        const newRetweetFeedItem = await tx.feedItem.create({
          data: {
            userId: userDbId,
            type: FeedType.RETWEET,
            retweetOfFeedItemId: feedItemId,
          },
          select: { id: true },
        });
        return {
          alreadyRetweeted: false,
          newFeedItemId: newRetweetFeedItem.id,
        };
      }
    );

    if (result.alreadyRetweeted) {
      return { success: true };
    }
    console.log(
      `[RetweetAction] Success. New FeedItem ID: ${result.newFeedItemId}`
    );
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(
      `[RetweetAction] Error retweeting FeedItem ${feedItemId}:`,
      error
    );
    // ★ Prisma エラーと一般的な Error で型ガード ★
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.log(`[RetweetAction] Already retweeted (caught in final catch).`);
      return { success: true };
    }
    // ★ instanceof Error でチェック ★
    const message =
      error instanceof Error
        ? error.message
        : "リツイート処理中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

/**
 * 指定された FeedItem へのリツイートを取り消す Server Action
 * @param feedItemId - リツイートを取り消したい元の FeedItem の ID
 * @returns ActionResult - 成功または失敗情報
 */
export async function undoRetweetAction(
  feedItemId: string
): Promise<ActionResult> {
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

  // 3. feedItemId のチェック
  if (!feedItemId) {
    return {
      success: false,
      error: "リツイート取り消し対象が指定されていません。",
    };
  }

  console.log(
    `[UndoRetweetAction] User ${userDbId} attempting to undo retweet for FeedItem ${feedItemId}`
  );

  try {
    // 4. データベース操作 (トランザクション)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // a. Retweet レコードを削除
      const deleteRetweet = await tx.retweet.deleteMany({
        where: {
          userId: userDbId,
          feedItemId: feedItemId,
        },
      });

      // b. FeedItem (type: RETWEET) を削除
      const deleteFeedItem = await tx.feedItem.deleteMany({
        where: {
          userId: userDbId, // 自分が作成した
          type: FeedType.RETWEET, // リツイートタイプの
          retweetOfFeedItemId: feedItemId, // 元の FeedItem を参照しているもの
        },
      });

      // c. (任意) 元の FeedItem の retweetCount を更新する場合 (今回は _count なので不要)
      // if (deleteRetweet.count > 0) { // 実際に Retweet が削除された場合のみデクリメント
      //   await tx.feedItem.update({
      //     where: { id: feedItemId },
      //     data: { retweetCount: { decrement: 1 } }
      //   });
      // }

      // 削除できた件数を返す (デバッグ用)
      return {
        deletedRetweets: deleteRetweet.count,
        deletedFeedItems: deleteFeedItem.count,
      };
    });

    // 実際に削除されたかどうかをログに出力
    if (result.deletedRetweets > 0 || result.deletedFeedItems > 0) {
      console.log(
        `[UndoRetweetAction] User ${userDbId} successfully undid retweet for FeedItem ${feedItemId}. Deleted ${result.deletedRetweets} Retweet record(s) and ${result.deletedFeedItems} FeedItem record(s).`
      );
    } else {
      console.log(
        `[UndoRetweetAction] No retweet found for FeedItem ${feedItemId} by user ${userDbId}.`
      );
    }

    // 5. キャッシュ再検証
    revalidatePath("/"); // ホームタイムライン
    // 他の関連パスも再検証
    // revalidatePath(`/profile/${retweeterUsername}`);
    // revalidatePath(`/status/${feedItemId}`);

    return { success: true };
  } catch (error) {
    console.error(
      `[UndoRetweetAction] Error undoing retweet for FeedItem ${feedItemId} by user ${userDbId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "リツイートの取り消し中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

// 引用リツイートのデータ型
interface QuoteRetweetData {
  commentContent: string;
  imageUrl?: string | null; // 画像 URL は Optional
}

// 引用リツイート作成アクションの戻り値型
type QuoteRetweetActionResult = ActionResult & {
  newPost?: Post; // 作成された引用コメント Post (任意)
  newFeedItem?: FeedItem; // 作成された引用 FeedItem (任意)
};

/**
 * [ACTION] 指定された FeedItem を引用してコメント付きでリツイートする (画像対応)
 * @param quotedFeedItemId - 引用したい元の FeedItem の ID
 * @param data - 引用コメントと画像 URL を含むオブジェクト
 * @returns QuoteRetweetActionResult - 成功/失敗情報と、任意で作成されたデータ
 */
export async function quoteRetweetAction(
  quotedFeedItemId: string,
  data: QuoteRetweetData
): Promise<QuoteRetweetActionResult> {
  // 1. 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) { return { success: false, error: "ログインしてください。" }; }

  // 2. ユーザーDB ID 取得
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) { return { success: false, error: "ユーザー情報が見つかりません。" }; }

  // 3. 引数バリデーション
  if (!quotedFeedItemId) { return { success: false, error: "引用元の投稿が指定されていません。" }; }
  const commentContent = data.commentContent;
  const imageUrl = data.imageUrl;
  const trimmedComment = commentContent.trim();
  if (trimmedComment.length === 0 && !imageUrl) { return { success: false, error: "コメントを入力するか画像を選択してください。" }; }
  if (trimmedComment.length > 280) { return { success: false, error: "コメントは280文字以内で入力してください。" }; }
  if (imageUrl && typeof imageUrl !== 'string') { return { success: false, error: "画像URLが不正です。" }; }

  console.log(`[QuoteRetweetAction] User ${userDbId} quoting FeedItem ${quotedFeedItemId}`);

  try {
    // 4. 引用元の FeedItem をチェック
    const originalFeedItem = await prisma.feedItem.findUnique({
      where: { id: quotedFeedItemId },
      select: { userId: true, user: { select: { isPrivate: true } }, type: true }, // type も取得してチェックする例
    });
    if (!originalFeedItem) { throw new Error("引用元の投稿が見つかりません。"); }
    if (originalFeedItem.user?.isPrivate) { throw new Error("非公開アカウントの投稿は引用できません。"); }
    // TODO: 必要なら引用元のタイプに基づいて引用を制限する (例: リツイートは引用できない等)

    // 5. データベース操作 (トランザクション)
    // ★ トランザクションの結果を分割代入で受け取る ★
    const { newPost, newFeedItem } = await prisma.$transaction(async (tx) => {
      // a. 引用コメント用の新しい Post を作成
      const createdPost = await tx.post.create({
        data: {
          authorId: userDbId,
          content: trimmedComment,
          imageUrl: imageUrl, // imageUrl を保存
          // likeCount はデフォルトで 0
        },
      });

      // b. 新しい FeedItem (type: QUOTE_RETWEET) を作成
      const createdFeedItem = await tx.feedItem.create({
        data: {
          userId: userDbId,
          type: FeedType.QUOTE_RETWEET,
          postId: createdPost.id,
          quotedFeedItemId: quotedFeedItemId,
          // createdAt はデフォルト
        },
      });

      // c. 引用元の FeedItem の quoteRetweetCount をインクリメント
      await tx.feedItem.update({
        where: { id: quotedFeedItemId },
        data: { quoteRetweetCount: { increment: 1 } },
      });

      // ★ トランザクションの結果として作成したデータを返す ★
      return { newPost: createdPost, newFeedItem: createdFeedItem };
    });

    // ★ トランザクション成功後の処理 ★
    console.log(`[QuoteRetweetAction] Success. Post: ${newPost.id}, FeedItem: ${newFeedItem.id}`);

    // 6. キャッシュ再検証
    revalidatePath("/"); // ホームタイムライン
    // 必要なら他のパスも再検証 (自分のプロフィール、元の投稿の詳細など)
    // const user = await prisma.user.findUnique({ where: { id: userDbId }, select: { username: true }});
    // if(user?.username) revalidatePath(`/profile/${user.username}`);
    // revalidatePath(`/feeds/${quotedFeedItemId}`);

    // ★ 最終的な成功時の戻り値 ★
    return { success: true, newPost, newFeedItem };

  } catch (error) {
    console.error(`[QuoteRetweetAction] Error quoting FeedItem ${quotedFeedItemId} by user ${userDbId}:`, error);
    const message = error instanceof Error ? error.message : "引用リツイート中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

/**
 * 指定された引用リツイート (FeedItem type: QUOTE_RETWEET) を削除する Server Action
 * @param feedItemId - 削除したい引用リツイート FeedItem の ID
 * @returns ActionResult - 成功または失敗情報
 */
export async function deleteQuoteRetweetAction(
  feedItemId: string
): Promise<ActionResult> {
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

  // 3. feedItemId のチェック
  if (!feedItemId) {
    return { success: false, error: "削除対象が指定されていません。" };
  }

  console.log(
    `[DeleteQuoteRetweetAction] User ${userDbId} attempting to delete QUOTE_RETWEET FeedItem ${feedItemId}`
  );

  try {
    // 4. 削除対象の FeedItem と関連情報を取得 (削除権限も確認)
    const feedItemToDelete = await prisma.feedItem.findUnique({
      where: {
        id: feedItemId,
        userId: userDbId, // 自分が作成した FeedItem であることを確認
        type: FeedType.QUOTE_RETWEET, // タイプが引用リツイートであることを確認
      },
      select: {
        postId: true, // 削除すべき引用コメント Post の ID
        quotedFeedItemId: true, // カウントを減らす引用元の FeedItem ID
      },
    });

    if (!feedItemToDelete) {
      throw new Error("削除対象の引用リツイートが見つからないか、削除権限がありません。");
    }
    // ★ postId が null でないこともここで確認しておくのがより安全 ★
    if (!feedItemToDelete.postId) {
      throw new Error("引用リツイートに関連する投稿が見つかりません。データ不整合の可能性があります。");
    }

    // 5. データベース操作 (トランザクション)
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      // a. 引用元の quoteRetweetCount をデクリメント
      //    (引用元が存在し、かつカウントが 0 より大きい場合のみ)
      if (feedItemToDelete.quotedFeedItemId) {
        await tx.feedItem.updateMany({
          where: {
            id: feedItemToDelete.quotedFeedItemId, // 引用元の ID
            quoteRetweetCount: { gt: 0 }, // カウントが 0 より大きい
          },
          data: {
            quoteRetweetCount: { decrement: 1 }, // カウントを 1 減らす
          },
        });
        console.log(
          `[DeleteQuoteRetweetAction] Decremented quote count for FeedItem ${feedItemToDelete.quotedFeedItemId}`
        );
      }

      // b. 関連する引用コメントの Post を削除
      const postIdToDelete = feedItemToDelete.postId;
      if (postIdToDelete) {
        await tx.post.delete({
          where: { id: postIdToDelete }, // ← if ブロックの中なので postIdToDelete は string 型として扱われる
        });
        console.log(`[DeleteQuoteRetweetAction] Deleted Post ${postIdToDelete}`);
      } else {
        // postId が null だった場合 (本来ありえないはず) のエラー処理
        console.error(`[DeleteQuoteRetweetAction] postId is null for FeedItem ${feedItemId}. Could not delete related post.`);
        // トランザクションを失敗させるためにエラーをスロー
        throw new Error(`Associated postId not found for QUOTE_RETWEET FeedItem ${feedItemId}.`);
      }

      // c. 引用リツイートの FeedItem 自体を削除
      await tx.feedItem.delete({
        where: { id: feedItemId }, // 引数で受け取った削除対象の FeedItem ID
      });
      console.log(
        `[DeleteQuoteRetweetAction] Deleted QUOTE_RETWEET FeedItem ${feedItemId}`
      );
    });

    console.log(
      `[DeleteQuoteRetweetAction] User ${userDbId} successfully deleted QUOTE_RETWEET FeedItem ${feedItemId} and related Post ${feedItemToDelete.postId}`
    );

    // 6. キャッシュ再検証
    revalidatePath("/");
    // revalidatePath(`/profile/${username}`);
    // 他、関連ページのキャッシュを必要に応じて再検証

    return { success: true };
  } catch (error) {
    console.error(
      `[DeleteQuoteRetweetAction] Error deleting QUOTE_RETWEET FeedItem ${feedItemId} by user ${userDbId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "引用リツイートの削除中にエラーが発生しました。";
    return { success: false, error: message };
  }
}
