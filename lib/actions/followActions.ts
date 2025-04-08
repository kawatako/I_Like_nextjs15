"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client"; // パスを修正
import { revalidatePath } from "next/cache";

// followAction 用の戻り値型 (エラーまたは成功)
type FollowActionResult = {
    success: boolean;
    error?: string;
};

// --- フォローアクション ---
export const followAction = async (
    clerkIdToFollow: string // フォロー対象の Clerk ID
): Promise<FollowActionResult> => {
  const { userId: currentClerkId } = await auth(); // 自分の Clerk ID

  if (!currentClerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  if (!clerkIdToFollow) {
     return { success: false, error: "フォロー対象のユーザーが指定されていません。" };
  }
  if (currentClerkId === clerkIdToFollow) {
      return { success: false, error: "自分自身をフォローすることはできません。" };
  }

  try {
    // Clerk ID からそれぞれの内部的な User ID (CUID) を取得
    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { clerkId: currentClerkId }, select: { id: true, username: true } }),
      prisma.user.findUnique({ where: { clerkId: clerkIdToFollow }, select: { id: true, username: true } })
    ]);

    if (!currentUser || !targetUser) {
        console.error(`followAction: Current user (${currentClerkId}) or target user (${clerkIdToFollow}) not found in DB.`);
        throw new Error("データベースにユーザーが見つかりません。");
    }
    const followerDbId = currentUser.id; // 自分の DB ID
    const followingDbId = targetUser.id; // 相手の DB ID

    // 既存のフォロー関係を検索
    const existingFollow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: followerDbId, followingId: followingDbId } },
    });

    if (existingFollow) {
      // アンフォロー処理
      await prisma.follow.delete({ where: { followerId_followingId: { followerId: followerDbId, followingId: followingDbId } } });
      console.log(`User (DB ID: ${followerDbId}) unfollowed user (DB ID: ${followingDbId})`);
    } else {
      // フォロー処理
      await prisma.follow.create({ data: { followerId: followerDbId, followingId: followingDbId } });
      console.log(`User (DB ID: ${followerDbId}) followed user (DB ID: ${followingDbId})`);
    }

    // 関連するプロフィールページを再検証
    if (targetUser.username) revalidatePath(`/profile/${targetUser.username}`);
    if (currentUser.username) revalidatePath(`/profile/${currentUser.username}`);
    revalidatePath('/');

    return { success: true };

  } catch (err) {
    console.error("Error in followAction:", err);
    const errorMessage = err instanceof Error ? err.message : "フォロー処理中にエラーが発生しました。";
    return { success: false, error: errorMessage };
  }
};