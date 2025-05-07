// lib/actions/postActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import type { ActionResult, PostWithData, FeedType } from "@/lib/types";
import { Prisma } from "@prisma/client";

interface CreatePostData {
  content: string;
  imageUrl?: string | null;
}

export async function createPostAction(
  data: CreatePostData
): Promise<ActionResult & { post?: PostWithData }> {
  // 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしていません。" };

  // DB ID 取得
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  // バリデーション
  const content = data.content?.trim();
  const imageUrl = data.imageUrl;
  if (!content) {
    return { success: false, error: "投稿内容を入力してください。" };
  }
  if (content.length > 280) {
    return { success: false, error: "投稿内容は280文字以内で入力してください。" };
  }

  try {
    // トランザクションで Post と FeedItem をまとめて作成
    const newPost = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const post = await tx.post.create({
        data: {
          authorId: userDbId,
          content,
          imageUrl,
        },
      });
      await tx.feedItem.create({
        data: {
          userId: userDbId,
          // Prisma7 では enum 型が取れないので文字列リテラルで
          type: "POST" as FeedType,
          postId: post.id,
        },
      });
      return post;
    });

    // キャッシュ再検証
    revalidatePath("/");
    // 必要ならプロフィールページも revalidatePath(`/profile/${username}`)

    return {
      success: true,
      message: "投稿しました！",
      post: newPost,
    };
  } catch (err) {
    console.error("[PostAction] Error creating post:", err);
    return {
      success: false,
      error: "投稿の作成中にエラーが発生しました。",
    };
  }
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  // 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };

  // DB ID 取得
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  // ID チェック
  if (!postId) {
    return { success: false, error: "削除対象の投稿IDが不正です。" };
  }

  try {
    // 投稿者確認
    const postToDelete = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
        author: { select: { username: true } },
      },
    });
    if (!postToDelete) {
      throw new Error("投稿が見つかりません。");
    }
    if (postToDelete.authorId !== userDbId) {
      return { success: false, error: "この投稿を削除する権限がありません。" };
    }

    // トランザクションで FeedItem と Post を削除
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.feedItem.deleteMany({
        where: {
          postId: postId,
          // type も文字列リテラルで
          type: "POST" as FeedType,
        },
      });
      await tx.post.delete({ where: { id: postId } });
    });

    // キャッシュ再検証
    revalidatePath("/");
    if (postToDelete.author?.username) {
      revalidatePath(`/profile/${postToDelete.author.username}`);
    }

    return { success: true };
  } catch (err) {
    console.error(`[DeletePostAction] Error deleting post ${postId}:`, err);
    const message = err instanceof Error ? err.message : "削除中にエラーが発生しました。";
    return { success: false, error: message };
  }
}
