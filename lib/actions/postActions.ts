// lib/actions/postActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import { FeedType, Post } from "@prisma/client";

export type CreatePostActionResult = {
  success: boolean;
  message?: string; // エラーメッセージ or 成功メッセージ
  post?: Post;
};

// ★ シグネチャ変更: 第一引数に prevState を追加 ★
export async function createPostAction(
  prevState: CreatePostActionResult | null, // 前の状態 (今回は使わない)
  formData: FormData
): Promise<CreatePostActionResult> {
  // ★ 戻り値は必ず CreatePostActionResult ★
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, message: "ログインしていません。" }; // ★ message を使うように変更
  }

  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) {
    return { success: false, message: "ユーザー情報が見つかりません。" };
  }

  const content = formData.get("content") as string;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return { success: false, message: "投稿内容を入力してください。" };
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > 280) {
    return {
      success: false,
      message: "投稿内容は280文字以内で入力してください。",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: { authorId: userDbId, content: trimmedContent },
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
