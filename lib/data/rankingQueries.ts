// lib/data/rankingQueries.ts

import prisma from "@/lib/client"; // Prisma Client のインポートパスを確認・修正
import { ListStatus, Prisma, Sentiment } from "@prisma/client";
import { auth } from "@clerk/nextjs/server"; // 権限チェックや表示制御のため auth を使う場合がある
import { profileRankingListSelect } from "@/lib/data/userQueries";
import type { PaginatedResponse, RankingSnippetForProfile } from "@/lib/types";

// 編集用データペイロード定義
export const rankingListEditPayload =
  Prisma.validator<Prisma.RankingListDefaultArgs>()({
    include: {
      items: { orderBy: { rank: "asc" } },
    },
  });

export type RankingListEditableData = Prisma.RankingListGetPayload<
  typeof rankingListEditPayload
>;

//ランキングの編集ページ (/rankings/[listId]/edit) で使用するための元データを、安全にデータベースから取得する関数
export async function getRankingListForEdit(
  listId: string
): Promise<RankingListEditableData | null> {
  console.log(
    `[RankingQueries] getRankingListForEdit called for listId: ${listId}`
  );
  const { userId: clerkId } = await auth(); // ここでも認証は必要
  if (!clerkId) {
    console.warn("[RankingQueries/Edit] User not authenticated.");
    return null;
  }
  try {
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true },
    });
    if (!currentUser) {
      console.warn(
        `[RankingQueries/Edit] User with clerkId ${clerkId} not found in DB.`
      );
      return null;
    }
    const userDbId = currentUser.id;
    console.log(`[RankingQueries/Edit] Authenticated user DB ID: ${userDbId}`);

    const rankingList = await prisma.rankingList.findUnique({
      where: {
        id: listId,
        authorId: userDbId, // 所有者チェック
      },
      include: rankingListEditPayload.include, // items を含む
    });

    if (!rankingList) {
      console.log(
        `[RankingQueries/Edit] List ${listId} not found or user ${userDbId} is not author.`
      );
      return null;
    }
    console.log(
      `[RankingQueries/Edit] Successfully fetched list ${listId} for user ${userDbId}`
    );
    return rankingList;
  } catch (error) {
    console.error(
      `[RankingQueries/Edit] Error fetching list ${listId}:`,
      error
    );
    return null;
  }
}

// --- ★ getRankingDetailsForView 関数 (元 rankingActions.ts から移動) ★ ---
// 閲覧用データペイロード定義 (author 情報を含む)
const rankingListViewPayload =
  Prisma.validator<Prisma.RankingListDefaultArgs>()({
    include: {
      items: { orderBy: { rank: "asc" } },
      author: {
        select: { id: true, clerkId: true, username: true, image: true },
      },
    },
  });
// 戻り値の型
export type RankingListViewData = Prisma.RankingListGetPayload<
  typeof rankingListViewPayload
>;

export async function getRankingDetailsForView(
  listId: string
): Promise<RankingListViewData | null> {
  console.log(
    `[RankingQueries/View] Fetching ranking details for listId: ${listId}`
  );
  const { userId: loggedInClerkId } = await auth(); // 閲覧者の Clerk ID
  let loggedInUserDbId: string | null = null;
  if (loggedInClerkId) {
    /* ... DB ID取得処理 (エラーハンドリング含む) ... */
    try {
      const viewer = await prisma.user.findUnique({
        where: { clerkId: loggedInClerkId },
        select: { id: true },
      });
      if (viewer) loggedInUserDbId = viewer.id;
      else console.warn(`[View] Viewer clerkId ${loggedInClerkId} not found.`);
    } catch (e) {
      console.error("Error fetching viewer ID", e);
    }
  }

  try {
    const rankingList = await prisma.rankingList.findUnique({
      where: {
        id: listId,
        OR: [
          // 表示条件: 公開済み、または (下書き かつ 自分作成)
          { status: ListStatus.PUBLISHED },
          {
            AND: [
              { status: ListStatus.DRAFT },
              { authorId: loggedInUserDbId ?? undefined },
            ],
          },
        ],
      },
      include: rankingListViewPayload.include, // items と author を含む
    });
    if (!rankingList) {
      console.log(
        `[RankingQueries/View] List ${listId} not found or permission denied.`
      );
      return null;
    }
    console.log(`[RankingQueries/View] Successfully fetched list ${listId}`);
    return rankingList;
  } catch (error) {
    console.error(
      `[RankingQueries/View] Error fetching list ${listId}:`,
      error
    );
    return null;
  }
}

// --- ★ getDraftRankingLists 関数 (元 userService.ts から移動) ★ ---
// 下書きリスト表示用 select 定義 (必要に応じて調整)
const draftRankingListSelect = {
  id: true,
  sentiment: true,
  subject: true,
  listImageUrl: true,
  status: true,
  _count: { select: { items: true } },
  createdAt: true,
  updatedAt: true,
  items: {
    select: { id: true, itemName: true, rank: true },
    orderBy: { rank: "asc" },
    take: 1,
  },
} satisfies Prisma.RankingListSelect;
// 戻り値の型
export type DraftRankingSnippet = Prisma.RankingListGetPayload<{
  select: typeof draftRankingListSelect;
}>;

// 特定ユーザーの下書きランキングリストを取得する
export async function getDraftRankingLists(
  userDbId: string
): Promise<DraftRankingSnippet[]> {
  console.log(
    `[RankingQueries/Drafts] Fetching DRAFT lists for userDbId: ${userDbId}`
  );
  if (!userDbId) return [];
  try {
    const draftLists = await prisma.rankingList.findMany({
      where: { authorId: userDbId, status: ListStatus.DRAFT },
      select: profileRankingListSelect,
      orderBy: { updatedAt: "desc" },
    });
    console.log(
      `[RankingQueries/Drafts] Found ${draftLists.length} draft lists for userDbId: ${userDbId}`
    );
    return draftLists;
  } catch (error) {
    console.error(
      `[RankingQueries/Drafts] Error fetching draft lists for userDbId ${userDbId}:`,
      error
    );
    return [];
  }
}
// 特定ユーザーのランキングリストをページネーションで取得する
export async function getProfileRankingsPaginated({
  userId,
  status,
  limit,
  cursor,
}: {
  userId: string;
  status: ListStatus; // 'PUBLISHED' または 'DRAFT' を受け取る
  limit: number;
  cursor?: string; // ? をつけて任意にする
}): Promise<PaginatedResponse<RankingSnippetForProfile>> {
  console.log(
    `[RankingQueries/Paginated] Fetching ${status} lists for user ${userId}, limit ${limit}, cursor ${cursor}`
  );

  // --- 引数チェック ---
  if (!userId) {
    console.warn("[getProfileRankingsPaginated] userId is required.");
    return { items: [], nextCursor: null };
  }
  if (limit <= 0) {
    console.warn("[getProfileRankingsPaginated] limit must be positive.");
    return { items: [], nextCursor: null };
  }

  // --- Prisma クエリ設定 ---
  const take = limit + 1; // 次のページがあるか確認するため +1 件取得
  const skip = cursor ? 1 : 0; // cursor があれば、そのアイテム自体は含めないので 1 スキップ
  const cursorOptions = cursor ? { id: cursor } : undefined; // cursor オブジェクトを作成

  // 並び順 (displayOrder 昇順 -> updatedAt 降順)
  const orderByOptions: Prisma.RankingListOrderByWithRelationInput[] = [
    { displayOrder: "asc" /* Prisma 5.x+ なら , nulls: 'last' */ },
    { updatedAt: "desc" },
  ];

  try {
    // --- データ取得実行 ---
    const rankingLists = await prisma.rankingList.findMany({
      where: {
        authorId: userId, // 指定されたユーザーのリスト
        status: status, // 指定されたステータスのリスト
      },
      select: profileRankingListSelect, // userQueries からインポートした select を適用
      orderBy: orderByOptions, // 定義した並び順を適用
      take: take, // 取得件数 (+1)
      skip: skip, // スキップ数 (cursorがあれば1)
      cursor: cursorOptions, // 開始カーソル
    });

    // --- 次のカーソル計算 ---
    let nextCursor: string | null = null;
    if (rankingLists.length > limit) {
      // limit より多く取得できた場合、次のページが存在する
      const nextItem = rankingLists.pop(); // 配列から最後の要素（limit+1 番目の要素）を取り出す
      if (nextItem) {
        nextCursor = nextItem.id; // その要素の ID を次のカーソルとする
      }
    }

    console.log(
      `[getProfileRankingsPaginated] Found ${rankingLists.length} items for this page. Next cursor: ${nextCursor}`
    );

    // --- 結果返却 ---
    // 戻り値の型は PaginatedResponse<RankingSnippetForProfile> になる
    return { items: rankingLists, nextCursor };
  } catch (error) {
    // --- エラーハンドリング ---
    console.error(
      `[getProfileRankingsPaginated] Error fetching ${status} lists for user ${userId}:`,
      error
    );
    return { items: [], nextCursor: null }; // エラー時は空の結果を返す
  }
}
