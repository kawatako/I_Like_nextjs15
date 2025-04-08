import prisma from "../client";
import { Prisma } from "@prisma/client"; // Prisma をインポート

// findMany の include に合わせて、取得する投稿データの型を定義
const postPayload = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    author: true, // User モデルの全フィールドが含まれる
    likes: {
      select: {
        userId: true, // いいねしたユーザーのID (DBのCUID)
      },
    },
    _count: {
      select: {
        replies: true, // 返信の数
      },
    },
  },
});

// 上記 payload に基づく投稿の型エイリアス
export type PostWithData = Prisma.PostGetPayload<typeof postPayload>;

/**
 * タイムラインまたは特定ユーザーのプロフィール用の投稿を取得する。
 * エラー時や該当なしの場合は空配列を返す。
 * @param userId - タイムライン表示の場合: ログインユーザーの DB ID (CUID)。プロフィール表示で username を使う場合は null。
 * @param username - プロフィール表示の場合: 対象ユーザーの username。タイムライン表示の場合は undefined。
 * @returns 投稿データの配列 (Promise)
 */
export async function fetchPosts(
  userId: string | null,
  username?: string
): Promise<PostWithData[]> {
  console.log(
    `WorkspacePosts called with userId: ${userId}, username: ${username}`
  );
  try {
    // 1. username が指定されている場合 (プロフィールページの投稿取得)
    if (username) {
      console.log(
        `WorkspacePosts: Fetching posts for profile username: ${username}`
      );
      const posts = await prisma.post.findMany({
        where: {
          author: {
            username: username,
          },
          // 必要であれば、ここでさらに条件を追加 (例: 公開されている投稿のみなど)
        },
        include: postPayload.include, // 定義した include を使用
        orderBy: {
          createdAt: "desc",
        },
      });
      console.log(
        `WorkspacePosts: Found ${posts.length} posts for username ${username}`
      );
      return posts; // PostWithData の配列を返す
    }

    // 2. userId が指定されている場合 (ホームタイムラインの投稿取得)
    if (userId) {
      console.log(
        `WorkspacePosts: Fetching timeline posts for userDbId: ${userId}`
      );
      // フォローしているユーザーの ID (DBのID) を取得
      const following = await prisma.follow.findMany({
        where: {
          followerId: userId, // 引数の userId は DB ID (CUID) である想定
        },
        select: {
          followingId: true,
        },
      });
      const followingIds = following.map((f) => f.followingId);
      const authorIds = [userId, ...followingIds]; // 自分とフォロー中の人の DB ID リスト

      const posts = await prisma.post.findMany({
        where: {
          authorId: {
            in: authorIds, // authorId がリストに含まれる投稿を取得
          },
        },
        include: postPayload.include, // 定義した include を使用
        orderBy: {
          createdAt: "desc",
        },
      });
      console.log(
        `WorkspacePosts: Found ${posts.length} timeline posts for userDbId ${userId}`
      );
      return posts; // PostWithData の配列を返す
    }

    // 3. username も userId も指定されなかった場合 (または無効な場合)
    console.warn(
      "fetchPosts: Neither valid userId nor username provided. Returning empty array."
    );
    return []; // ★ 空配列を返す ★
  } catch (error) {
    // 4. データベースエラーなどが発生した場合
    console.error("fetchPosts: Error fetching posts:", error);
    return []; // ★ エラー時も空配列を返す ★
  }
}
