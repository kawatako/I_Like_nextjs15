// lib/actions/followActions.ts
"use server";

import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import {
  PaginatedResponse,
  FollowActionResult,
  UserSnippet,
  FollowRequestWithRequester,
  FollowStatusInfo,
} from "@/lib/types";
import { userSnippetSelect } from "@/lib/prisma/payloads";

// --- ヘルパー関数 --- //

/** 認証済みユーザーの DB-ID を取得、未認証時は例外を投げる */
async function requireUserDbId(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("ログインしてください。");
  const dbId = await getUserDbIdByClerkId(clerkId);
  if (!dbId) throw new Error("ユーザー情報が見つかりません。");
  return dbId;
}

/**
 * アクション実行をラップし、共通のレスポンス形式で返す
 * fn は { status: ... } を返す関数
 */
async function wrapAction(
  fn: () => Promise<Pick<FollowActionResult, "status">>
): Promise<FollowActionResult> {
  try {
    const { status } = await fn();
    return { success: true, status };
  } catch (err: any) {
    return { success: false, error: err.message, status: "error" };
  }
}

// フォローリクエスト取得用 payload
const followRequestWithRequesterPayload = {
  include: { requester: { select: userSnippetSelect } },
} as const;

// --- ページネーション付きクエリ --- //

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
  const follows = await safeQuery(() =>
    prisma.follow.findMany({
      where: { followerId: targetUserId },
      select: { following: { select: userSnippetSelect }, id: true },
      orderBy: { id: "asc" },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })
  );
  let nextCursor: string | null = null;
  if (follows.length > limit) nextCursor = follows.pop()!.id;
  return { items: follows.map((f) => f.following), nextCursor };
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
  const follows = await safeQuery(() =>
    prisma.follow.findMany({
      where: { followingId: targetUserId },
      select: { follower: { select: userSnippetSelect }, id: true },
      orderBy: { id: "asc" },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })
  );
  let nextCursor: string | null = null;
  if (follows.length > limit) nextCursor = follows.pop()!.id;
  return { items: follows.map((f) => f.follower), nextCursor };
}

export async function getPaginatedReceivedFollowRequests({
  targetUserId,
  limit,
  cursor,
}: {
  targetUserId: string;
  limit: number;
  cursor?: string;
}): Promise<PaginatedResponse<FollowRequestWithRequester>> {
  if (!targetUserId) return { items: [], nextCursor: null };
  const take = limit + 1;
  const requests = await safeQuery(() =>
    prisma.followRequest.findMany({
      where: { requestedId: targetUserId, status: "PENDING" },
      include: followRequestWithRequesterPayload.include,
      orderBy: { id: "asc" },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })
  );
  let nextCursor: string | null = null;
  if (requests.length > limit) nextCursor = requests.pop()!.id;
  return { items: requests, nextCursor };
}

// --- フォローリクエスト承認／拒否 --- //

export async function acceptFollowRequestAction(
  requestId: string
): Promise<FollowActionResult> {
  return wrapAction(async () => {
    const userDbId = await requireUserDbId();
    await safeQuery(() =>
      prisma.$transaction(async (tx) => {
        const req = await tx.followRequest.findUnique({
          where: { id: requestId, requestedId: userDbId, status: "PENDING" },
          select: {
            requesterId: true,
            requestedId: true,
            requester: { select: { username: true } },
            requested: { select: { username: true } },
          },
        });
        if (!req) throw new Error("有効なリクエストがありません。");
        await tx.followRequest.update({
          where: { id: requestId },
          data: { status: "ACCEPTED", updatedAt: new Date() },
        });
        await tx.follow.create({
          data: { followerId: req.requesterId, followingId: req.requestedId },
        });
        revalidatePath(`/profile/${req.requester.username}`);
        revalidatePath(`/profile/${req.requested.username}`);
        revalidatePath(`/follows/${req.requester.username}`);
        revalidatePath(`/follows/${req.requested.username}`);
      })
    );
    return { status: "following" };
  });
}

export async function rejectFollowRequestAction(
  requestId: string
): Promise<FollowActionResult> {
  return wrapAction(async () => {
    const userDbId = await requireUserDbId();
    await safeQuery(() =>
      prisma.followRequest.updateMany({
        where: { id: requestId, requestedId: userDbId, status: "PENDING" },
        data: { status: "REJECTED", updatedAt: new Date() },
      })
    );
    const me = await safeQuery(() =>
      prisma.user.findUnique({
        where: { id: userDbId },
        select: { username: true },
      })
    );
    if (me?.username) revalidatePath(`/follows/${me.username}`);
    return { status: "not_following" };
  });
}

// --- フォロー状態取得 --- //

export async function getFollowStatus(
  loggedInUserId: string | null,
  targetUserId: string
): Promise<FollowStatusInfo | null> {
  const target = await safeQuery(() =>
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, isPrivate: true },
    })
  );
  if (!target) return null;
  const base = {
    targetUserId: target.id,
    targetUsername: target.username,
    targetIsPrivate: target.isPrivate,
  };
  if (loggedInUserId === target.id) return { ...base, status: "SELF" };
  if (!loggedInUserId) return { ...base, status: "CANNOT_FOLLOW" };

  const follow = await safeQuery(() =>
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: loggedInUserId,
          followingId: target.id,
        },
      },
    })
  );
  if (follow) return { ...base, status: "FOLLOWING" };

  const sent = await safeQuery(() =>
    prisma.followRequest.findFirst({
      where: {
        requesterId: loggedInUserId,
        requestedId: target.id,
        status: "PENDING",
      },
    })
  );
  if (sent) return { ...base, status: "REQUEST_SENT" };

  const rec = await safeQuery(() =>
    prisma.followRequest.findFirst({
      where: {
        requesterId: target.id,
        requestedId: loggedInUserId,
        status: "PENDING",
      },
    })
  );
  if (rec) return { ...base, status: "REQUEST_RECEIVED" };

  return { ...base, status: "NOT_FOLLOWING" };
}

// --- フォロー／アンフォロー／キャンセル --- //

export async function followUserAction(
  targetUserDbId: string
): Promise<FollowActionResult> {
  return wrapAction(async () => {
    const userDbId = await requireUserDbId();
    if (userDbId === targetUserDbId)
      throw new Error("自分自身はフォローできません。");

    const target = await safeQuery(() =>
      prisma.user.findUnique({
        where: { id: targetUserDbId },
        select: { isPrivate: true, username: true },
      })
    );
    if (!target) throw new Error("フォロー対象が見つかりません。");

    const [existsFollow, existsRequest] = await Promise.all([
      safeQuery(() =>
        prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userDbId,
              followingId: targetUserDbId,
            },
          },
        })
      ),
      safeQuery(() =>
        prisma.followRequest.findUnique({
          where: {
            requesterId_requestedId: {
              requesterId: userDbId,
              requestedId: targetUserDbId,
            },
          },
        })
      ),
    ]);
    if (existsFollow) return { status: "following" };
    if (existsRequest) return { status: "requested" };

    if (!target.isPrivate) {
      await safeQuery(() =>
        prisma.follow.create({
          data: { followerId: userDbId, followingId: targetUserDbId },
        })
      );
      return { status: "following" };
    } else {
      await safeQuery(() =>
        prisma.followRequest.create({
          data: {
            requesterId: userDbId,
            requestedId: targetUserDbId,
            status: "PENDING",
          },
        })
      );
      return { status: "requested" };
    }
  });
}

export async function unfollowUserAction(
  targetUserDbId: string
): Promise<FollowActionResult> {
  return wrapAction(async () => {
    const userDbId = await requireUserDbId();
    if (userDbId === targetUserDbId)
      throw new Error("自分自身のフォローを解除できません。");
    await safeQuery(() =>
      prisma.follow.deleteMany({
        where: { followerId: userDbId, followingId: targetUserDbId },
      })
    );
    return { status: "not_following" };
  });
}

export async function cancelFollowRequestAction(
  targetUserDbId: string
): Promise<FollowActionResult> {
  return wrapAction(async () => {
    const userDbId = await requireUserDbId();
    await safeQuery(() =>
      prisma.followRequest.deleteMany({
        where: {
          requesterId: userDbId,
          requestedId: targetUserDbId,
          status: "PENDING",
        },
      })
    );
    return { status: "not_following" };
  });
}
