import { unstable_cache } from "next/cache";
import prisma from "../client";

//home timeline
export async function fetchPosts(userId: string | null, username?: string) {
  if (username) {
    return await prisma.post.findMany({
      where: {
        author: {
          username: username,
        },
      },
      include: {
        author: true,
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  if (!username && userId) {
    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      select: {
        followingId: true,
      },
    });

    const followingIds = following.map((f) => f.followingId);
    const ids = [userId, ...followingIds]; //自分とフォローしているユーザーのIDを取得(timelineに表示するため)

    return await prisma.post.findMany({
      where: {
        authorId: {
          in: ids,
        },
      },
      include: {
        author: true,
        likes: {
          select: {
            userId: true,
          },
        },
        //返信数の取得
        _count: {
          select: {
            replies: true,
          },
        },
      },
      // //作成日時の降順(最新のものから)ソート
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
