// lib/data/postQueries.ts
"use server"; // データ取得関数もサーバーサイドで動作することが多い

import prisma from "../client";
import { Prisma } from "@prisma/client";
// 他のインポート (getCurrentLoginUserData など) もこのファイルにある想定

// --- Post 関連のデータ取得 ---

// findMany の include に合わせて、取得する投稿データの型を定義
const postPayload = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    author: true, // ← true に変更して全フィールドを取得
    likes: {
      select: { userId: true },
    },
    _count: {
      select: { replies: true },
    },
  },
});

// 上記 payload に基づく投稿の型エイリアス (export する)
export type PostWithData = Prisma.PostGetPayload<typeof postPayload>;

/**
 * タイムラインまたは特定ユーザーのプロフィール用の投稿を取得する。
 * @param userId - タイムライン表示の場合: ログインユーザーの DB ID。プロフィール表示で username を使う場合は null。
 * @param username - プロフィール表示の場合: 対象ユーザーの username。タイムライン表示の場合は undefined。
 * @returns 投稿データの配列 (Promise)
 */
export async function fetchPosts(
  userId: string | null,
  username?: string
): Promise<PostWithData[]> {
  console.log(`WorkspacePosts called with userId: ${userId}, username: ${username}`);
  try {
    if (username) {
      // プロフィールページの投稿取得
      console.log(`WorkspacePosts: Fetching posts for profile username: ${username}`);
      const posts = await prisma.post.findMany({
        where: { author: { username: username } },
        include: postPayload.include,
        orderBy: { createdAt: "desc" },
      });
      console.log(`WorkspacePosts: Found ${posts.length} posts for username ${username}`);
      return posts;
    }

    if (userId) {
      // ホームタイムラインの投稿取得 (※注意: これは FeedItem ベースではない)
      // タイムラインは getHomeFeed を使うべきだが、ここでは関数をそのまま移動
      console.log(`WorkspacePosts: Fetching timeline posts for userDbId: ${userId}`);
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      const authorIds = [userId, ...followingIds];

      const posts = await prisma.post.findMany({
        where: { authorId: { in: authorIds } },
        include: postPayload.include,
        orderBy: { createdAt: "desc" },
      });
      console.log(`WorkspacePosts: Found ${posts.length} timeline posts for userDbId ${userId}`);
      return posts;
    }

    console.warn("fetchPosts: Neither userId nor username provided.");
    return [];
  } catch (error) {
    console.error("fetchPosts: Error fetching posts:", error);
    return [];
  }
}

// --- ★ いいねした投稿を取得する関数 (新規追加 - 仮実装) ★ ---
export async function fetchLikedPosts(userId: string): Promise<PostWithData[]> {
    console.log(`WorkspaceLikedPosts called for userId: ${userId}`);
    if (!userId) return [];
    try {
        const likedPosts = await prisma.post.findMany({
            where: {
                likes: {
                    some: { userId: userId } // userId がいいねした投稿
                }
            },
            include: postPayload.include, // 同じペイロードを使用
            orderBy: { createdAt: 'desc' } // いいねした日時順の方が良い場合もある (Like モデルに createdAt が必要)
        });
        console.log(`WorkspaceLikedPosts: Found ${likedPosts.length} liked posts for user ${userId}`);
        return likedPosts;
    } catch (error) {
        console.error(`WorkspaceLikedPosts: Error fetching liked posts for user ${userId}:`, error);
        return [];
    }
}

// ... (他の userQueries や rankingQueries など) ...