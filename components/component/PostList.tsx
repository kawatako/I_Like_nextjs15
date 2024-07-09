// components/PostList.tsx
import { auth } from "@clerk/nextjs/server";
import Post from "./Post";
import prisma from "@/lib/client";

export default async function PostList({ username }: { username?: string }) {
  // const posts = [
  //   {
  //     id: 1,
  //     author: { name: "Jane Doe", username: "@janedoe" },
  //     content:
  //       "Excited to share my latest project with you all! Check it out and let me know what you think.",
  //     timestamp: "2h",
  //     comments: [
  //       { author: "John Doe", content: "Great work!" },
  //       { author: "Jane Doe", content: "Looks amazing!" },
  //     ],
  //   },
  //   {
  //     id: 2,
  //     author: { name: "John Smith", username: "@johnsmith" },
  //     content:
  //       "Enjoying the beautiful weather today! Whos up for a hike later?",
  //     timestamp: "1h",
  //   },
  // ];

  let posts: any[] = [];

  const { userId } = auth();

  //home timeline
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

    posts = await prisma.post.findMany({
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

  console.log(posts);

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  );
}
