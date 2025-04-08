import prisma from "../client";
import { Prisma } from "@prisma/client"; // PostWithAuthor の型定義に使う

// PostList コンポーネントが期待する Post の型 (仮、必要なら調整)
// Post に加えて Author 情報を含める
const postWithAuthor = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: { author: true, likes: { select: { userId: true }}, _count: { select: { replies: true }} },
});
export type PostWithAuthor = Prisma.PostGetPayload<typeof postWithAuthor>;


/**
 * 特定のユーザーがいいねした投稿一覧を取得する関数
 * @param userDbId いいねした投稿を取得したいユーザーの DB ID (CUID)
 * @returns いいねした Post の配列 (Author情報を含む)
 */
export async function getLikedPosts(userDbId: string): Promise<PostWithAuthor[]> {
  console.log(`likeService: Fetching liked posts for userDbId: ${userDbId}`);
  try {
    const likes = await prisma.like.findMany({
      where: {
        userId: userDbId,
      },
      select: {
        // いいねした Post の情報を取得 (author情報も含む)
        post: {
          include: {
            author: true, // 投稿者情報
            likes: {      // 各投稿のいいねユーザーIDリスト
              select: { userId: true }
            },
            _count: {     // 各投稿の返信数
                select: { replies: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc', // いいねした日時順（または投稿日時順でも良い）
      },
    });

    // likes 配列から post オブジェクトだけを抽出して返す
    const likedPosts = likes.map(like => like.post);
    console.log(`likeService: Found ${likedPosts.length} liked posts for userDbId: ${userDbId}`);
    return likedPosts;

  } catch (error) {
    console.error(`likeService: Error fetching liked posts for userDbId ${userDbId}:`, error);
    return []; // エラー時は空配列を返す
  }
}