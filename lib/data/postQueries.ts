// lib/data/postQueries.ts
import prisma from "../client";
import { Prisma } from "@prisma/client";
import { userSnippetSelect,postPayload } from "../prisma/payloads"; // User スニペット
import type { PostWithData } from "@/lib/types";

/**
 * 特定ユーザーのプロフィール用の投稿を取得する。
 * @param _userId - 現在未使用
 * @param username - プロフィール表示の場合: 対象ユーザーの username
 * @returns 投稿データの配列 (Promise)
 */
export async function fetchPosts(
  _userId: string | null, // この引数は username があれば使われない
  username?: string
): Promise<PostWithData[]> {
  console.log(`WorkspacePosts called with username: ${username}`);
  if (!username) {
    console.warn("fetchPosts: username is required.");
    return [];
  }

  try {
    // プロフィールページの投稿取得
    const posts = await prisma.post.findMany({
      where: { author: { username: username } },
      select: postPayload.select, // ★ postPayload の select を使用 ★
      orderBy: { createdAt: "desc" },
    });
    console.log(
      `WorkspacePosts: Found ${posts.length} posts for username ${username}`
    );
    return posts;
  } catch (error) {
    console.error("fetchPosts: Error fetching posts:", error);
    return [];
  }
}
