// lib/actions/followActions.ts
"use server";

import prisma from "@/lib/client";
import { auth } from "@clerk/nextjs/server";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import type { PaginatedResponse, UserSnippet,FollowStatusInfo } from "@/lib/types";

// --- 認証済みユーザーの DB-ID を取得 --- //
async function requireUserDbId(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("ログインしてください。");
  const dbId = await getUserDbIdByClerkId(clerkId);
  if (!dbId) throw new Error("ユーザーが見つかりません。");
  return dbId;
}

// --- フォロー／フォロワー一覧のページネーション --- //
export async function getPaginatedFollowing({
  targetUserId,
  limit,
  cursor,
}: {
  targetUserId: string;
  limit: number;
  cursor?: string;
}): Promise<PaginatedResponse<UserSnippet>> {
  if (!targetUserId) return { items: [], nextCursor: null };
  const take = limit + 1;
  const follows = await prisma.follow.findMany({
    where: { followerId: targetUserId },
    select: { following: { select: { id: true, username: true, name: true, image: true } }, id: true },
    orderBy: { id: "asc" },
    take,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
  });
  let nextCursor: string | null = null;
  if (follows.length > limit) nextCursor = follows.pop()!.id;
  return {
    items: follows.map((f) => f.following),
    nextCursor,
  };
}

export async function getPaginatedFollowers({
  targetUserId,
  limit,
  cursor,
}: {
  targetUserId: string;
  limit: number;
  cursor?: string;
}): Promise<PaginatedResponse<UserSnippet>> {
  if (!targetUserId) return { items: [], nextCursor: null };
  const take = limit + 1;
  const follows = await prisma.follow.findMany({
    where: { followingId: targetUserId },
    select: { follower: { select: { id: true, username: true, name: true, image: true } }, id: true },
    orderBy: { id: "asc" },
    take,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
  });
  let nextCursor: string | null = null;
  if (follows.length > limit) nextCursor = follows.pop()!.id;
  return {
    items: follows.map((f) => f.follower),
    nextCursor,
  };
}

// --- フォロー状態取得 --- //

export async function getFollowStatus(
  loggedInUserId: string | null,
  targetUserId: string
): Promise<FollowStatusInfo | null> {
  // ユーザー情報（username）取得
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true /*, isPrivate?: boolean*/ },
  });
  if (!target) return null;

  const base = {
    targetUserId: target.id,
    targetUsername: target.username,
    targetIsPrivate: false,
  };

  // 自分自身なら SELF
  if (loggedInUserId === target.id) {
    return { ...base, status: "SELF" };
  }

  // 未ログイン時は NOT_FOLLOWING
  if (!loggedInUserId) {
    return { ...base, status: "NOT_FOLLOWING" };
  }

  // フォロー行があれば FOLLOWING、なければ NOT_FOLLOWING
  const exists = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: loggedInUserId,
        followingId: target.id,
      },
    },
  });
  return {
    ...base,
    status: exists ? "FOLLOWING" : "NOT_FOLLOWING",
  };
}

// --- フォロー --- //
export async function followUserAction(
  targetUserDbId: string
): Promise<{ success: boolean; status: "FOLLOWING" | "NOT_FOLLOWING"; error?: string }> {
  try {
    const userDbId = await requireUserDbId();
    if (userDbId === targetUserDbId) {
      return { success: false, status: "NOT_FOLLOWING", error: "自分自身はフォローできません。" };
    }
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: userDbId,
          followingId: targetUserDbId,
        },
      },
      create: { followerId: userDbId, followingId: targetUserDbId },
      update: {},
    });

    // revalidatePath 用に username を安全に取得
    const me = await prisma.user.findUnique({
      where: { id: userDbId },
      select: { username: true },
    });
    if (me?.username) {
      revalidatePath(`/follows/${me.username}`);
    }
    const target = await prisma.user.findUnique({
      where: { id: targetUserDbId },
      select: { username: true },
    });
    if (target?.username) {
      revalidatePath(`/follows/${target.username}`);
    }

    return { success: true, status: "FOLLOWING" };
  } catch (err: any) {
    return { success: false, status: "NOT_FOLLOWING", error: err.message };
  }
}

// --- フォロー解除 --- //
export async function unfollowUserAction(
  targetUserDbId: string
): Promise<{ success: boolean; status: "FOLLOWING" | "NOT_FOLLOWING"; error?: string }> {
  try {
    const userDbId = await requireUserDbId();
    if (userDbId === targetUserDbId) {
      return { success: false, status: "FOLLOWING", error: "自分自身のフォローを解除できません。" };
    }
    await prisma.follow.deleteMany({
      where: { followerId: userDbId, followingId: targetUserDbId },
    });

    const me = await prisma.user.findUnique({
      where: { id: userDbId },
      select: { username: true },
    });
    if (me?.username) {
      revalidatePath(`/follows/${me.username}`);
    }
    const target = await prisma.user.findUnique({
      where: { id: targetUserDbId },
      select: { username: true },
    });
    if (target?.username) {
      revalidatePath(`/follows/${target.username}`);
    }

    return { success: true, status: "NOT_FOLLOWING" };
  } catch (err: any) {
    return { success: false, status: "FOLLOWING", error: err.message };
  }
}
