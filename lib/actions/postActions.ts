// lib/actions/postActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import { FeedType, Post } from "@prisma/client";
import type { ActionResult } from "@/lib/types";

interface CreatePostData {
  content: string;
  imageUrl?: string | null; // 画像 URL は Optional
}

// 投稿の作成アクション
export async function createPostAction(
  // ★ 引数を prevState, formData から data オブジェクトに変更 ★
  data: CreatePostData
): Promise<ActionResult & { post?: Post }> { // 成功時に Post を返すかも
  // 1. 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしていません。" };

  // 2. ユーザーDB ID 取得
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  // 3. 入力内容のバリデーション (引数から取得)
  const content = data.content;
  const imageUrl = data.imageUrl; // 画像 URL を受け取る

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { success: false, error: "投稿内容を入力してください。" };
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > 280) {
    return { success: false, error: "投稿内容は280文字以内で入力してください。" };
  }
  // 画像 URL のバリデーション (任意)
  if (imageUrl && typeof imageUrl !== 'string') {
    return { success: false, error: "画像URLが不正です。" };
  }

  try {
    // 4. データベース操作 (トランザクション)
    const result = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          authorId: userDbId,
          content: trimmedContent,
          imageUrl: imageUrl, // ★ imageUrl を保存 ★
        },
      });
      await tx.feedItem.create({
        data: { userId: userDbId, type: FeedType.POST, postId: newPost.id },
      });
      return newPost;
    });

    console.log(
      `[PostAction] Post created successfully by user ${userDbId}: ${result.id}`
    );
    revalidatePath("/");
    // ユーザー名取得は不要になるか、別の方法で
    // const user = await prisma.user.findUnique({ where: { id: userDbId }, select: { username: true }});
    // if (user?.username) { revalidatePath(`/profile/${user.username}`); }

    // ★ 成功時の戻り値 ★
    return { success: true, message: "投稿しました！", post: result };
  } catch (error) {
    console.error("[PostAction] Error creating post:", error);
    // ★ 失敗時の戻り値 ★
    return { success: false, message: "投稿の作成中にエラーが発生しました。" };
  }
}

/**
 * [ACTION] 指定された投稿を削除する (postId を直接受け取る)
 * 投稿者本人のみが削除可能。関連する FeedItem (type: POST) も削除する。
 * @param postId - 削除する対象の Post の ID
 * @returns ActionResult - 成功または失敗情報
 */
export async function deletePostAction(
  postId: string // ★ 引数を postId のみに変更 ★
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

  // 3. postId のチェック (引数で受け取るので formData は不要)
  if (!postId || typeof postId !== 'string') {
    return { success: false, error: "削除対象の投稿IDが不正です。" };
  }

  console.log(`[DeletePostAction] User ${userDbId} attempting to delete Post ${postId}`);

  try {
    // 4. 削除対象の投稿を取得し、権限を確認
    const postToDelete = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, author: { select: { username: true } } },
    });

    if (!postToDelete) {
      throw new Error("削除対象の投稿が見つかりません。");
    }

    // ★ 権限チェック ★
    if (postToDelete.authorId !== userDbId) {
      console.warn(`[DeletePostAction] Permission denied: User ${userDbId} cannot delete Post ${postId}`);
      return { success: false, error: "この投稿を削除する権限がありません。" };
    }

    // 5. データベース操作 (トランザクション)
    await prisma.$transaction(async (tx) => {
      // a. 関連する FeedItem (type: POST) を削除
      await tx.feedItem.deleteMany({
        where: { postId: postId, type: FeedType.POST },
      });
      console.log(`[DeletePostAction] Deleted associated FeedItem(s) for Post ${postId}`);

      // b. Post 本体を削除 (Like, Reply は onDelete: Cascade で自動削除想定)
      await tx.post.delete({
        where: { id: postId },
      });
      console.log(`[DeletePostAction] Deleted Post ${postId}`);
    });

    console.log(`[DeletePostAction] Successfully deleted Post ${postId} by user ${userDbId}`);

    // 6. キャッシュ再検証
    revalidatePath("/");
    if (postToDelete.author?.username) {
      revalidatePath(`/profile/${postToDelete.author.username}`);
    }
    // 詳細ページは削除されたので revalidate 不要 (アクセスすると 404 になる)
    // revalidatePath(`/feeds/${postId}`);

    return { success: true };

  } catch (error) {
    console.error(`[DeletePostAction] Error deleting Post ${postId}:`, error);
    const message = error instanceof Error ? error.message : "投稿の削除中にエラーが発生しました。";
    return { success: false, error: message };
  }
}