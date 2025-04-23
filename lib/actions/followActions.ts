// lib/actions/followActions.ts
"use server";

import prisma from "@/lib/client";
import { Prisma, FollowRequestStatus } from "@prisma/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { PaginatedResponse, ActionResult } from "../types";
import type { UserSnippet } from "@/lib/types";

// ユーザー情報の型定義 (変更なし)
const userSnippetSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} satisfies Prisma.UserSelect;

// フォローリクエストの型定義 (変更なし)
const followRequestWithRequesterPayload =
  Prisma.validator<Prisma.FollowRequestDefaultArgs>()({
    include: {
      requester: { select: userSnippetSelect }, // リクエスター情報を含める
    },
  });

export type FollowRequestWithRequester = Prisma.FollowRequestGetPayload<
  typeof followRequestWithRequesterPayload
>;

type FollowActionResult = ActionResult & { status?: "following" | "requested" | "not_following" | "error"; };


//[PAGINATED] 指定されたユーザーがフォローしているユーザー一覧 (カーソルベース)
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

  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: targetUserId },
      select: {
        following: { select: userSnippetSelect }, // フォローされている人の情報
        id: true, // ★ カーソル用に新しい単一 ID を選択 ★
      },
      orderBy: {
        id: "asc", // ★ 単一 ID で並び替え (昇順/降順は一貫させればOK) ★
      },
      take: take,
      cursor: cursor ? { id: cursor } : undefined, // ★ 単一 ID をカーソルとして使用 ★
      skip: cursor ? 1 : 0,
    });

    let nextCursor: string | null = null;
    if (follows.length > limit) {
      const nextItem = follows.pop();
      nextCursor = nextItem?.id ?? null; // ★ 次のカーソルとして ID を使用 ★
    }

    const items = follows.map((follow) => follow.following); // ← エラーが解消されるはず
    return { items, nextCursor };
  } catch (error) {
    /* ... エラーハンドリング ... */ return { items: [], nextCursor: null };
  }
}

//[PAGINATED] 指定されたユーザーをフォローしているユーザー一覧 (カーソルベース)
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

  try {
    const follows = await prisma.follow.findMany({
      where: { followingId: targetUserId },
      select: {
        follower: { select: userSnippetSelect }, // フォローしている人の情報
        id: true, // ★ カーソル用に新しい単一 ID を選択 ★
      },
      orderBy: {
        id: "asc", // ★ 単一 ID で並び替え ★
      },
      take: take,
      cursor: cursor ? { id: cursor } : undefined, // ★ 単一 ID をカーソルとして使用 ★
      skip: cursor ? 1 : 0,
    });

    let nextCursor: string | null = null;
    if (follows.length > limit) {
      const nextItem = follows.pop();
      nextCursor = nextItem?.id ?? null; // ★ 次のカーソルとして ID を使用 ★
    }

    const items = follows.map((follow) => follow.follower); // ← エラーが解消されるはず
    return { items, nextCursor };
  } catch (error) {
    /* ... エラーハンドリング ... */ return { items: [], nextCursor: null };
  }
}

//[PAGINATED] 指定されたユーザー宛の「申請中」フォローリクエスト一覧 (カーソルベース)
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

  try {
    const requests = await prisma.followRequest.findMany({
      where: {
        requestedId: targetUserId,
        status: FollowRequestStatus.PENDING,
      },
      include: followRequestWithRequesterPayload.include,
      orderBy: {
        id: "asc", // FollowRequest の ID で並び替え
      },
      take: take,
      cursor: cursor ? { id: cursor } : undefined, // FollowRequest の ID をカーソルに
      skip: cursor ? 1 : 0,
    });

    let nextCursor: string | null = null;
    if (requests.length > limit) {
      const nextItem = requests.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { items: requests, nextCursor };
  } catch (error) {
    /* ... エラーハンドリング ... */ return { items: [], nextCursor: null };
  }
}

/**
 * [ACTION] フォローリクエストを承認する
 * FollowRequest の status を ACCEPTED に更新し、Follow レコードを作成する。
 * @param requestId 承認する FollowRequest の ID
 * @returns FollowActionResult (成功/失敗)
 */
export async function acceptFollowRequestAction(
  requestId: string
): Promise<FollowActionResult> {
  const { userId: loggedInClerkId } = await auth();
  if (!loggedInClerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId);
  if (!loggedInUserDbId) {
    return { success: false, error: "ユーザーが見つかりません。" };
  }

  console.log(
    `[FollowActions/Accept] User ${loggedInUserDbId} attempting to accept request ${requestId}`
  );

  try {
    // データベース操作をトランザクション内で実行し、整合性を保つ
    const result = await prisma.$transaction(async (tx) => {
      // 1. 承認対象のリクエストを取得 (自分が申請先で、かつ PENDING のもの)
      const request = await tx.followRequest.findUnique({
        where: {
          id: requestId,
          requestedId: loggedInUserDbId, // 自分がリクエストされていることを確認
          status: FollowRequestStatus.PENDING, // 申請中であることを確認
        },
        select: {
          // フォローレコード作成に必要なIDと、キャッシュ再検証用のユーザー名を取得
          requesterId: true,
          requestedId: true,
          requester: { select: { username: true } },
          requested: { select: { username: true } },
        },
      });

      // リクエストが存在しない、または条件に合わない場合はエラー
      if (!request) {
        throw new Error(
          "有効なフォローリクエストが見つからないか、承認権限がありません。"
        );
      }

      // 2. FollowRequest の status を ACCEPTED に更新
      await tx.followRequest.update({
        where: {
          id: requestId,
          // requestedId: loggedInUserDbId, // where で指定済みだが念のため
          // status: FollowRequestStatus.PENDING,
        },
        data: {
          status: FollowRequestStatus.ACCEPTED,
          updatedAt: new Date(),
        },
      });

      // 3. 新しい Follow レコードを作成
      // 既にフォロー関係が存在する場合に備えて create ではなく upsert を使うか、
      // create の前に存在チェックをしても良いが、リクエストがPENDINGなら通常存在しないはず。
      // ここでは create を試みる。
      await tx.follow.create({
        data: {
          followerId: request.requesterId, // リクエストを送った人がフォロワー
          followingId: request.requestedId, // 承認した自分(ログインユーザー)がフォローされる側
        },
      });

      // キャッシュ再検証に必要なユーザー名を返す
      return {
        requesterUsername: request.requester.username,
        requestedUsername: request.requested.username,
      };
    });

    console.log(`[FollowActions/Accept] Request ${requestId} accepted.`);

    // --- キャッシュ再検証 ---
    // フォロー関係が変わった双方のプロフィールページとフォローリストページを再検証
    if (result.requesterUsername)
      revalidatePath(`/profile/${result.requesterUsername}`);
    if (result.requestedUsername)
      revalidatePath(`/profile/${result.requestedUsername}`);
    if (result.requestedUsername)
      revalidatePath(`/follows/${result.requestedUsername}`);
    if (result.requesterUsername)
      revalidatePath(`/follows/${result.requesterUsername}`);

    return { success: true };
  } catch (error) {
    console.error(
      `[FollowActions/Accept] Error accepting request ${requestId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "リクエストの承認中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

/**
 * [ACTION] フォローリクエストを拒否する
 * FollowRequest の status を REJECTED に更新する。
 * @param requestId 拒否する FollowRequest の ID
 * @returns FollowActionResult (成功/失敗)
 */
export async function rejectFollowRequestAction(
  requestId: string
): Promise<FollowActionResult> {
  const { userId: loggedInClerkId } = await auth();
  if (!loggedInClerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId);
  if (!loggedInUserDbId) {
    return { success: false, error: "ユーザーが見つかりません。" };
  }

  console.log(
    `[FollowActions/Reject] User ${loggedInUserDbId} attempting to reject request ${requestId}`
  );

  try {
    // 該当の PENDING リクエストを REJECTED に更新 (updateMany で対象がなくてもエラーにならない)
    const updateResult = await prisma.followRequest.updateMany({
      where: {
        id: requestId,
        requestedId: loggedInUserDbId, // 自分がリクエストされている
        status: FollowRequestStatus.PENDING, // 申請中である
      },
      data: {
        status: FollowRequestStatus.REJECTED,
        updatedAt: new Date(),
      },
    });

    // 実際に更新されたか確認 (更新されなくてもエラーではない場合もある)
    if (updateResult.count === 0) {
      console.warn(
        `[FollowActions/Reject] Request ${requestId} not found, not pending, or permission denied for user ${loggedInUserDbId}. No records updated.`
      );
      // throw new Error("有効なフォローリクエストが見つからないか、拒否権限がありません。");
      // ↑ エラーにするか、成功とみなすかは要件次第。ここでは成功として扱う。
    }

    console.log(
      `[FollowActions/Reject] Request ${requestId} marked as rejected (or was already handled).`
    );

    // --- キャッシュ再検証 ---
    // 自分のフォローリストページ（リクエストタブ）を再検証
    const currentUser = await prisma.user.findUnique({
      where: { id: loggedInUserDbId },
      select: { username: true },
    });
    if (currentUser?.username) {
      revalidatePath(`/follows/${currentUser.username}`);
    }

    return { success: true };
  } catch (error) {
    console.error(
      `[FollowActions/Reject] Error rejecting request ${requestId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "リクエストの拒否中にエラーが発生しました。";
    return { success: false, error: message };
  }
}

export type FollowStatus =
  | "SELF" // 自分自身
  | "NOT_FOLLOWING" // フォローしていない (公開アカウント)
  | "FOLLOWING" // フォロー中
  | "REQUEST_SENT" // フォローリクエスト送信済み (相手が非公開)
  | "REQUEST_RECEIVED" // 相手からフォローリクエストが来ている (承認待ち)
  | "BLOCKED" // 相手をブロックしている (将来的に実装する場合)
  | "BLOCKED_BY" // 相手からブロックされている (将来的に実装する場合)
  | "CANNOT_FOLLOW"; // フォローできないその他の理由 (例: ログインしていない)

// getFollowStatus が返す情報の型
export type FollowStatusInfo = {
  status: FollowStatus;
  targetUserId: string; // 対象ユーザーのDB ID
  targetUsername: string; // 対象ユーザーの username
  targetIsPrivate: boolean; // 対象ユーザーが非公開か
  // followRequestId?: string; // 送信済みリクエストのID (キャンセル用)
};

/**
 * 指定された2ユーザー間のフォロー状態を取得します。
 * @param viewerDbId ページを閲覧しているユーザーの DB ID (ログインしていない場合は null)
 * @param targetUserId プロフィールページの対象ユーザーの DB ID
 * @returns FollowStatusInfo 型のオブジェクト
 */
export async function getFollowStatus(
  viewerDbId: string | null,
  targetUserId: string
): Promise<FollowStatusInfo | null> {
  console.log(
    `[FollowQueries] Checking follow status between viewer ${viewerDbId} and target ${targetUserId}`
  );

  // 対象ユーザーが存在するか、isPrivate かなどを取得
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, isPrivate: true },
  });

  if (!targetUser) {
    console.log(`[FollowQueries] Target user ${targetUserId} not found.`);
    return null; // 対象ユーザーが見つからない
  }

  // 自分自身のプロフィールの場合
  if (viewerDbId === targetUserId) {
    return {
      status: "SELF",
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetIsPrivate: targetUser.isPrivate,
    };
  }

  // ログインしていない場合 (フォロー/リクエスト不可)
  if (!viewerDbId) {
    return {
      status: "CANNOT_FOLLOW",
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetIsPrivate: targetUser.isPrivate,
    };
  }

  // --- ログインしている場合のチェック ---
  try {
    // 1. 既にフォローしているか確認 (Follow レコードが存在するか)
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerDbId,
          followingId: targetUserId,
        },
      },
      select: { createdAt: true }, // 存在確認だけなので select は軽量に
    });

    if (existingFollow) {
      console.log(
        `[FollowQueries] Viewer ${viewerDbId} IS FOLLOWING ${targetUserId}`
      );
      return {
        status: "FOLLOWING",
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetIsPrivate: targetUser.isPrivate,
      };
    }

    // 2. フォローリクエストを送信済みか確認 (FollowRequest レコード (PENDING) が存在するか)
    const sentRequest = await prisma.followRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId: viewerDbId,
          requestedId: targetUserId,
        },
        status: FollowRequestStatus.PENDING, // PENDING のリクエストのみチェック
      },
      select: { id: true }, // IDがあればキャンセル用に使える
    });

    if (sentRequest) {
      console.log(
        `[FollowQueries] Viewer ${viewerDbId} HAS REQUESTED ${targetUserId}`
      );
      // return { status: "REQUEST_SENT", targetUserId: targetUser.id, targetUsername: targetUser.username, targetIsPrivate: targetUser.isPrivate, followRequestId: sentRequest.id };
      return {
        status: "REQUEST_SENT",
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetIsPrivate: targetUser.isPrivate,
      }; // followRequestId は一旦含めない
    }

    // 3. 相手からフォローリクエストが来ているか確認 (承認待ち)
    const receivedRequest = await prisma.followRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId: targetUserId, // 相手が申請者
          requestedId: viewerDbId, // 自分が申請先
        },
        status: FollowRequestStatus.PENDING,
      },
      select: { id: true },
    });

    if (receivedRequest) {
      console.log(
        `[FollowQueries] Viewer ${viewerDbId} HAS RECEIVED REQUEST FROM ${targetUserId}`
      );
      return {
        status: "REQUEST_RECEIVED",
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetIsPrivate: targetUser.isPrivate,
      };
    }

    // 4. 拒否された履歴があるか確認 (拒否後は再申請不可とする場合)
    const rejectedRequest = await prisma.followRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId: viewerDbId,
          requestedId: targetUserId,
        },
        status: FollowRequestStatus.REJECTED, // REJECTED のリクエストをチェック
      },
      select: { id: true },
    });

    if (rejectedRequest) {
      console.log(
        `[FollowQueries] Viewer ${viewerDbId} WAS REJECTED BY ${targetUserId}`
      );
      // 拒否された場合の状態を返すか、CANNOT_FOLLOW にするかは要件次第
      // ここでは仮に REQUEST_SENT と同じにするか、専用の状態を作る
      // return { status: "REJECTED_BY_TARGET", ... };
      return {
        status: "CANNOT_FOLLOW",
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetIsPrivate: targetUser.isPrivate,
      }; // 仮にフォロー不可とする
    }

    // 上記のいずれでもない場合: フォローもリクエストもしていない
    console.log(
      `[FollowQueries] Viewer ${viewerDbId} is NOT FOLLOWING and NO PENDING/REJECTED request for ${targetUserId}`
    );
    return {
      status: "NOT_FOLLOWING",
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetIsPrivate: targetUser.isPrivate,
    };

    // TODO: ブロック機能実装時にはブロック状態もチェックする
  } catch (error) {
    console.error(
      `[FollowQueries] Error checking follow status between ${viewerDbId} and ${targetUserId}:`,
      error
    );
    return {
      status: "CANNOT_FOLLOW",
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetIsPrivate: targetUser.isPrivate,
    }; // エラー時はフォロー不可とする
  }
}

// --- ★★★ [ACTION] ユーザーをフォローする / フォローリクエストを送る ★★★ ---
export async function followUserAction(
  targetUserDbId: string
): Promise<FollowActionResult> {
  const { userId: loggedInClerkId } = await auth();
  if (!loggedInClerkId) {
    return { success: false, error: "ログインしてください。", status: "error" };
  }
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId);
  if (!loggedInUserDbId) {
    return {
      success: false,
      error: "ユーザー情報が見つかりません。",
      status: "error",
    };
  }

  // 自分自身はフォローできない
  if (loggedInUserDbId === targetUserDbId) {
    return {
      success: false,
      error: "自分自身をフォローすることはできません。",
      status: "error",
    };
  }

  console.log(
    `[FollowActions/Follow] User ${loggedInUserDbId} attempting to follow/request ${targetUserDbId}`
  );

  try {
    // 1. 対象ユーザーの存在とプライベート設定を確認
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserDbId },
      select: { isPrivate: true, username: true }, // isPrivate と username を取得
    });
    if (!targetUser) {
      throw new Error("フォロー対象のユーザーが見つかりません。");
    }

    // 2. 既にフォロー済みか確認
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: loggedInUserDbId,
          followingId: targetUserDbId,
        },
      },
    });
    if (existingFollow) {
      console.log(
        `[FollowActions/Follow] Already following ${targetUserDbId}.`
      );
      return { success: true, status: "following" }; // 既にフォローしているので成功扱い
    }

    // 3. 既にリクエスト送信済み (PENDING) か確認
    const existingRequest = await prisma.followRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId: loggedInUserDbId,
          requestedId: targetUserDbId,
        },
        status: FollowRequestStatus.PENDING,
      },
    });
    if (existingRequest) {
      console.log(
        `[FollowActions/Follow] Request already sent to ${targetUserDbId}.`
      );
      return { success: true, status: "requested" }; // 既にリクエスト済みなので成功扱い
    }

    // 4. 過去に拒否されているか確認 (拒否後は再申請不可の仕様)
    const rejectedRequest = await prisma.followRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId: loggedInUserDbId,
          requestedId: targetUserDbId,
        },
        status: FollowRequestStatus.REJECTED,
      },
    });
    if (rejectedRequest) {
      console.log(
        `[FollowActions/Follow] Request was previously rejected by ${targetUserDbId}.`
      );
      return {
        success: false,
        error:
          "以前にフォローリクエストが拒否されたため、再度リクエストを送信できません。",
        status: "error",
      };
    }

    // 5. 相手が公開アカウントか非公開アカウントかで処理を分岐
    if (!targetUser.isPrivate) {
      // --- 公開アカウントの場合: 即時フォロー ---
      await prisma.follow.create({
        data: {
          followerId: loggedInUserDbId,
          followingId: targetUserDbId,
        },
      });
      console.log(
        `[FollowActions/Follow] User ${loggedInUserDbId} successfully followed (public) ${targetUserDbId}`
      );
      // TODO: フォローされたことの通知を targetUserDbId に作成 (任意)
      // await createNotification(targetUserDbId, loggedInUserDbId, 'NEW_FOLLOWER', null);

      // キャッシュ再検証
      revalidatePath(`/profile/${targetUser.username}`); // 相手のプロフィール
      const loggedInUser = await prisma.user.findUnique({
        where: { id: loggedInUserDbId },
        select: { username: true },
      });
      if (loggedInUser?.username)
        revalidatePath(`/profile/${loggedInUser.username}`); // 自分のプロフィール
      if (loggedInUser?.username)
        revalidatePath(`/follows/${loggedInUser.username}`); // 自分のフォローリスト

      return { success: true, status: "following" };
    } else {
      // --- 非公開アカウントの場合: フォローリクエストを作成 ---
      // upsert を使うと、過去に ACCEPTED/REJECTED があっても PENDING に上書きできてしまうので create を使う
      await prisma.followRequest.create({
        data: {
          requesterId: loggedInUserDbId,
          requestedId: targetUserDbId,
          status: FollowRequestStatus.PENDING, // デフォルトだが明示
        },
      });
      console.log(
        `[FollowActions/Follow] User ${loggedInUserDbId} successfully sent follow request to (private) ${targetUserDbId}`
      );
      // TODO: フォローリクエストが来たことの通知を targetUserDbId に作成 (任意)
      // await createNotification(targetUserDbId, loggedInUserDbId, 'FOLLOW_REQUEST', null);

      // キャッシュ再検証 (相手のプロフィールだけで良いかも)
      revalidatePath(`/profile/${targetUser.username}`);

      return { success: true, status: "requested" };
    }
  } catch (error) {
    console.error(
      `[FollowActions/Follow] Error following/requesting user ${targetUserDbId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "フォロー処理中にエラーが発生しました。";
    return { success: false, error: message, status: "error" };
  }
}

// --- ★★★ [ACTION] ユーザーのフォローを解除する ★★★ ---
export async function unfollowUserAction(
  targetUserDbId: string
): Promise<FollowActionResult> {
  const { userId: loggedInClerkId } = await auth();
  if (!loggedInClerkId) {
    return { success: false, error: "ログインしてください。", status: "error" };
  }
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId);
  if (!loggedInUserDbId) {
    return {
      success: false,
      error: "ユーザー情報が見つかりません。",
      status: "error",
    };
  }

  // 自分自身はアンフォローできない
  if (loggedInUserDbId === targetUserDbId) {
    return {
      success: false,
      error: "自分自身のフォローを解除することはできません。",
      status: "error",
    };
  }

  console.log(
    `[FollowActions/Unfollow] User ${loggedInUserDbId} attempting to unfollow ${targetUserDbId}`
  );

  try {
    // 該当する Follow レコードを削除
    const deleteResult = await prisma.follow.deleteMany({
      // deleteMany の方が where で指定しやすい
      where: {
        followerId: loggedInUserDbId,
        followingId: targetUserDbId,
      },
    });

    if (deleteResult.count > 0) {
      console.log(
        `[FollowActions/Unfollow] User ${loggedInUserDbId} successfully unfollowed ${targetUserDbId}`
      );
    } else {
      // 既にフォローしていなかった場合も、エラーとはせず成功扱いにする（UI上はフォロー解除の状態になるため）
      console.log(
        `[FollowActions/Unfollow] User ${loggedInUserDbId} was not following ${targetUserDbId}, no record deleted.`
      );
    }

    // キャッシュ再検証
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserDbId },
      select: { username: true },
    });
    const loggedInUser = await prisma.user.findUnique({
      where: { id: loggedInUserDbId },
      select: { username: true },
    });
    if (targetUser?.username) revalidatePath(`/profile/${targetUser.username}`);
    if (loggedInUser?.username)
      revalidatePath(`/profile/${loggedInUser.username}`);
    if (loggedInUser?.username)
      revalidatePath(`/follows/${loggedInUser.username}`); // 自分のフォローリスト

    return { success: true, status: "not_following" };
  } catch (error) {
    console.error(
      `[FollowActions/Unfollow] Error unfollowing user ${targetUserDbId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "フォロー解除中にエラーが発生しました。";
    return { success: false, error: message, status: "error" };
  }
}

// --- ★★★ [ACTION] 送信済みのフォローリクエストを取り消す ★★★ ---
export async function cancelFollowRequestAction(
  targetUserDbId: string
): Promise<FollowActionResult> {
  const { userId: loggedInClerkId } = await auth();
  if (!loggedInClerkId) {
    return { success: false, error: "ログインしてください。", status: "error" };
  }
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId);
  if (!loggedInUserDbId) {
    return {
      success: false,
      error: "ユーザー情報が見つかりません。",
      status: "error",
    };
  }

  console.log(
    `[FollowActions/CancelRequest] User ${loggedInUserDbId} attempting to cancel request to ${targetUserDbId}`
  );

  try {
    // 自分が申請者(requester)で、相手が申請先(requested)で、かつ PENDING のリクエストを削除
    const deleteResult = await prisma.followRequest.deleteMany({
      where: {
        requesterId: loggedInUserDbId,
        requestedId: targetUserDbId,
        status: FollowRequestStatus.PENDING,
      },
    });

    if (deleteResult.count > 0) {
      console.log(
        `[FollowActions/CancelRequest] User ${loggedInUserDbId} successfully cancelled request to ${targetUserDbId}`
      );
    } else {
      // リクエストが存在しなかった、または既に処理されていた場合もエラーとはしない
      console.log(
        `[FollowActions/CancelRequest] No pending request found from ${loggedInUserDbId} to ${targetUserDbId}.`
      );
    }

    // キャッシュ再検証
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserDbId },
      select: { username: true },
    });
    if (targetUser?.username) {
      revalidatePath(`/profile/${targetUser.username}`); // 相手のプロフィールを再検証
    }

    return { success: true, status: "not_following" }; // 操作後の状態は未フォローになる
  } catch (error) {
    console.error(
      `[FollowActions/CancelRequest] Error cancelling follow request to ${targetUserDbId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "フォローリクエストの取り消し中にエラーが発生しました。";
    return { success: false, error: message, status: "error" };
  }
}
