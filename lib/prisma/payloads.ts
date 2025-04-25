// lib/prisma/payloads.ts
// ここに共通の Prisma Select/Include/Payload 定義を集約します
import { Prisma, ListStatus, FeedType } from "@prisma/client";

// --- User Snippet ---
/** ユーザーの基本情報（多くの場所で利用） */
export const userSnippetSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} satisfies Prisma.UserSelect;

// --- Post Payload ---
/** 投稿と関連情報（作者、いいね、リプライ数） */
export const postPayload = Prisma.validator<Prisma.PostDefaultArgs>()({
  select: {
    id: true,
    content: true,
    imageUrl: true, // 画像 URL
    createdAt: true,
    author: { select: userSnippetSelect }, // 作成者情報
    _count: { select: { replies: true } }, // リプライ数
    likes: { select: { userId: true } },   // いいねしたユーザーID（自分がいいねしたか判定用）
    likeCount: true,                      // いいね総数
  },
});

// --- RankingList Snippet ---
/** ランキングリストの概要情報（プロフィールやカード表示用） */
export const rankingListSnippetSelect = Prisma.validator<Prisma.RankingListSelect>()({
  id: true,
  subject: true,
  description: true,
  listImageUrl: true,
  status: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
  items: { // 上位3アイテム（画像含む）
    orderBy: { rank: 'asc' }, take: 3,
    select: { id: true, rank: true, itemName: true, imageUrl: true },
  },
  likes: { select: { userId: true } }, // いいね状態判定用
  likeCount: true,                    // いいね数
  _count: { select: { items: true } }  // アイテム総数
  // sentiment は削除済み
  // author は必要に応じて UserSnippet を別途取得
});

// --- RankingList Edit Payload ---
/** ランキング編集ページで必要なデータ */
// ★ ランキング編集用データ Select 定義 (修正) ★
export const rankingListEditSelect = Prisma.validator<Prisma.RankingListSelect>()({
  id: true,
  subject: true,
  description: true,
  status: true,
  listImageUrl: true,
  author: { // ★ author を含める ★
    select: { id: true, username: true } // username も含める
  },
  items: { // 全アイテムを取得
    orderBy: { rank: "asc" },
    select: { id: true, rank: true, itemName: true, itemDescription: true, imageUrl: true }
  },
  tags: { // ★ tags の正しい select 構文 ★
    select: {
      // 中間テーブルは意識せず、直接 Tag のフィールドを指定
      id: true, // Tag の ID
      name: true // Tag の 名前
    }
  }
});

// --- RankingList View Payload ---
/** ランキング詳細表示ページで必要なデータ */
// ★ ランキング詳細表示用データ Select 定義
export const rankingListViewSelect = Prisma.validator<Prisma.RankingListSelect>()({
  id: true,
  subject: true,
  description: true,
  status: true,
  listImageUrl: true,
  createdAt: true,
  updatedAt: true,
  likeCount: true,
  likes: { select: { userId: true } },
  author: { select: userSnippetSelect }, // ★ UserSnippet を使用 ★
  items: { // 全アイテムを取得
    orderBy: { rank: "asc" },
    select: { id: true, rank: true, itemName: true, itemDescription: true, imageUrl: true,createdAt:true,listId: true }
  },
  tags: { // ★ tags の正しい select 構文 ★
    select: {
      id: true, // Tag の ID
      name: true, // Tag の 名前

    }
  },
   _count: { select: { items: true } }
});

// --- Nested Feed Item Select (for Retweet/Quote origins) ---
// ★ ネストされた FeedItem を取得するための Select ★
//    (rankingListSnippetSelect を使うように修正)
const nestedFeedItemSelect = Prisma.validator<Prisma.FeedItemSelect>()({
  id: true, type: true, createdAt: true, updatedAt: true, userId: true, postId: true, rankingListId: true, quoteRetweetCount: true,
  user: { select: userSnippetSelect },
  post: { select: postPayload.select },
  rankingList: { select: rankingListSnippetSelect }, // ★ rankingListSnippetSelect を使用 ★
  _count: { select: { retweets: true } },
});


// --- Feed Item Payload (Main Payload) ---
/** タイムラインや詳細表示で使う FeedItem とその関連情報 */
export const feedItemPayload = Prisma.validator<Prisma.FeedItemDefaultArgs>()({
  select: {
    // FeedItem 自身のフィールド
    id: true, type: true, createdAt: true, updatedAt: true, userId: true, postId: true,
    rankingListId: true, retweetOfFeedItemId: true, quotedFeedItemId: true,
    quoteRetweetCount: true,
    // 関連データ
    user: { select: userSnippetSelect },
    post: { select: postPayload.select },
    rankingList: { select: rankingListSnippetSelect }, // ★ rankingListSnippetSelect を使用 ★
    _count: { select: { retweets: true } }, // この FeedItem へのリツイート数
    // ネストされた FeedItem (上記 nestedFeedItemSelect を使用)
    retweetOfFeedItem: { select: nestedFeedItemSelect },
    quotedFeedItem: { select: nestedFeedItemSelect }
  }
});

// --- User Profile Payload ---
/** プロフィールページで取得するユーザーデータ全体 */
export const userProfilePayload = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true, clerkId: true, username: true, image: true, name: true, bio: true, coverImageUrl: true,location: true,birthday: true, socialLinks: true, createdAt: true,
    rankingLists: { // 公開リストのみ
      where: { status: ListStatus.PUBLISHED },
      select: rankingListSnippetSelect, // ★ rankingListSnippetSelect を使用 ★
      orderBy: [ { displayOrder: 'asc' /* , nulls: 'last' */ }, { updatedAt: 'desc' } ],
    },
    _count: { select: { following: true, followedBy: true } }
  }
});