// lib/actions/postActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import type { ActionResult, PostWithData, FeedType } from "@/lib/types";
import { postPayload } from "@/lib/prisma/payloads";

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
  const content = data.content.trim();
  if (!content) return { success: false, error: "投稿内容を入力してください。" };
  if (content.length > 280) return { success: false, error: "投稿内容は280文字以内です。" };

  try {
    // 1) Post 作成
    const post = await safeQuery(() =>
      prisma.post.create({
        data: { authorId: userDbId, content, imageUrl: data.imageUrl },
      })
    );

    // 2) FeedItem 作成
    await safeQuery(() =>
      prisma.feedItem.create({
        data: { userId: userDbId, type: "POST" as const, postId: post.id },
      })
    );

    // 3) 完全なデータを取得
    const full = await safeQuery(() =>
      prisma.post.findUnique({
        where: { id: post.id },
        select: postPayload.select,
      })
    );

    // キャッシュ再検証
    revalidatePath("/");

    return { success: true, message: "投稿しました！", post: full! };
  } catch (err: any) {
    console.error("[createPostAction] Error:", err);
    return { success: false, error: "投稿の作成中にエラーが発生しました。" };
  }
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  // 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  // 投稿確認
  const rec = await safeQuery(() =>
    prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, author: { select: { username: true } } },
    })
  );
  if (!rec) return { success: false, error: "投稿が見つかりません。" };
  if (rec.authorId !== userDbId) return { success: false, error: "権限がありません。" };

  try {
    // 依存のない２つを配列版 transaction でまとめて削除
    await safeQuery(() =>
      prisma.$transaction([
        prisma.feedItem.deleteMany({
          where: { postId, type: "POST" as FeedType },
        }),
        prisma.post.delete({ where: { id: postId } }),
      ])
    );

    // キャッシュ再検証
    revalidatePath("/");
    if (rec.author?.username) {
      revalidatePath(`/profile/${rec.author.username}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("[deletePostAction] Error:", err);
    return { success: false, error: "削除中にエラーが発生しました。" };
  }
}
