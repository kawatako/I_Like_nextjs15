// lib/data/feedQueries.ts
import prisma from "@/lib/client"; // Prisma Client のインポートパス
import {
  Prisma,
  FeedItem,
  User,
  Post,
  RankingList,
  RankedItem,
} from "@prisma/client";

// --- 型定義 ---

// ユーザー情報のスニペット (必要な情報だけを選択)
export const userSnippetSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} satisfies Prisma.UserSelect;

export type UserSnippet = Prisma.UserGetPayload<{
  select: typeof userSnippetSelect;
}>;

// FeedItem とその関連データを一緒に取得するためのペイロード定義
// Prisma.validator を使うと、型の安全性を保ちつつ複雑な include/select を定義できる
const feedItemPayload = Prisma.validator<Prisma.FeedItemDefaultArgs>()({
  include: {
    // 1. この FeedItem を作成したユーザーの情報
    user: {
      select: userSnippetSelect, // 上で定義したスニペットを使用
    },
    // 2. 関連する投稿 (type が POST or QUOTE_RETWEET の場合)
    post: {
      select: {
        id: true,
        content: true,
//        imageUrl: true, // 画像URLも含める
        createdAt: true,
        // 必要に応じて author 情報なども select できるが、FeedItem.user と重複するので注意
      },
    },
    // 3. 関連するランキングリスト (type が RANKING_UPDATE の場合)
    rankingList: {
      include: {
        // ランキングリストの基本情報
        // select で絞っても良い
        // author: { select: userSnippetSelect }, // FeedItem.user と重複する可能性あり
        items: {
          // ランキング内のアイテムも一部取得 (例: 上位3件)
          orderBy: { rank: "asc" },
          take: 3,
          select: {
            id: true,
            rank: true,
            itemName: true,
            imageUrl: true,
          },
        },
      },
    },
    // 4. リツイート元の FeedItem (type が RETWEET の場合)
    retweetOfFeedItem: {
      // ★注意★ ここで再度 include をネストさせる
      // 無限ネストや過剰なデータ取得を防ぐため、必要な情報に絞る (select) か、
      // ネストレベルを制限するなどの工夫が必要な場合がある。
      // ここでは1段階だけネストさせる例を示す。
      include: {
        user: { select: userSnippetSelect }, // 元の投稿者
        post: {
          select: { id: true, content: true, createdAt: true },
        }, // 元の投稿内容
        rankingList: {
          // 元がランキング更新の場合
          include: {
            items: {
              orderBy: { rank: "asc" },
              take: 3,
              select: { id: true, rank: true, itemName: true, imageUrl: true },
            },
          },
        },
        // 必要であれば、リツイート元のリツイート元をさらに辿ることもできるが、複雑になる
      },
    },
    // 5. 引用リツイート元の FeedItem (type が QUOTE_RETWEET の場合)
    quotedFeedItem: {
      // retweetOfFeedItem と同様に、必要なデータを include/select で取得
      include: {
        user: { select: userSnippetSelect },
        post: {
          select: { id: true, content: true, createdAt: true },
        },
        rankingList: {
          include: {
            items: {
              orderBy: { rank: "asc" },
              take: 3,
              select: { id: true, rank: true, itemName: true, imageUrl: true },
            },
          },
        },
      },
    },
    // TODO: いいね数やリツイート数なども取得したい場合は、リレーションカウントを使う
    // _count: { select: { likes: true, retweets: true, replies: true }} // Like, Retweet, Reply モデルとのリレーションが必要
  },
});

// getHomeFeed が返す FeedItem の型 (上記ペイロードに基づく)
export type FeedItemWithRelations = Prisma.FeedItemGetPayload<
  typeof feedItemPayload
>;

// ページネーション結果の型
export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

// --- 関数本体 ---

/**
 * 指定されたユーザーのホームタイムラインフィードを取得する (カーソルベースページネーション)
 * @param userId タイムラインを取得したいユーザーの DB ID
 * @param limit 1ページあたりの取得件数
 * @param cursor 前のページの最後のアイテムの ID (次のページの開始位置)
 * @returns PaginatedResponse<FeedItemWithRelations>
 */
export async function getHomeFeed({
  userId,
  limit,
  cursor,
}: {
  userId: string;
  limit: number;
  cursor?: string;
}): Promise<PaginatedResponse<FeedItemWithRelations>> {
  if (!userId) {
    // userId がない場合は空を返すかエラーにする
    console.warn("[getHomeFeed] userId is required.");
    return { items: [], nextCursor: null };
  }

  const take = limit + 1; // 次のカーソルが存在するか確認するために1件多く取得

  try {
    // 1. ログインユーザーがフォローしているユーザーのIDリストを取得
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }, // フォローしている相手のIDだけ取得
    });
    const followingIds = following.map((f) => f.followingId);

    // 2. 取得対象となるユーザーIDリストを作成 (フォローしている人 + 自分自身)
    const targetUserIds = [...followingIds, userId];

    // 3. FeedItem を取得
    const feedItems = await prisma.feedItem.findMany({
      where: {
        userId: {
          in: targetUserIds, // フォローしている人 + 自分の FeedItem を取得
        },
        // 必要であれば、ここにさらに条件を追加できる
        // 例: リツイートは含めるが、リツイートのリツイートは含めないなど
        // type: { not: FeedType.SOME_TYPE_TO_EXCLUDE }
      },
      include: feedItemPayload.include, // ★ 定義したペイロードを適用
      orderBy: {
        createdAt: "desc", // 新しい順
      },
      take: take,
      skip: cursor ? 1 : 0, // cursor がある場合、そのカーソルのアイテム自体はスキップ
      cursor: cursor ? { id: cursor } : undefined, // カーソル指定
    });

    // 4. 次のカーソルを決定
    let nextCursor: string | null = null;
    if (feedItems.length > limit) {
      // limit より1件多く取得できていれば、次のページが存在する
      const nextItem = feedItems.pop(); // 余分な1件を取り出す
      nextCursor = nextItem!.id; // そのIDを次のカーソルとする
    }

    // 5. 結果を返す
    return { items: feedItems, nextCursor };
  } catch (error) {
    console.error("[getHomeFeed] Error fetching home feed:", error);
    // エラー発生時は空の結果を返すか、エラーをスローするかは要件による
    return { items: [], nextCursor: null };
  }
}
