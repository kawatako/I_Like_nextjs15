// components/PostList.tsx
import { auth } from "@clerk/nextjs/server";
import Post from "./Post";
import prisma from "@/lib/client";
import { fetchPosts } from "@/lib/postDataFetcher";

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

  const { userId } = auth();

  const posts = await fetchPosts(userId, username);

  return (
    <div className="space-y-4">
      {posts
        ? posts.map((post) => <Post key={post.id} post={post} />)
        : "No posts found!"}
    </div>
  );
}
