// lib/data/postQueries.ts
import prisma from "../client";
import { Prisma } from "@prisma/client";
import { userSnippetSelect } from "./feedQueries"; // または "./feedQueries"

// --- Post 関連のデータ取得 ---

// findMany の select/include に合わせて、取得する投稿データの型を定義
// ★★★ postPayload から likes の include を削除 ★★★
export const postPayload = Prisma.validator<Prisma.PostDefaultArgs>()({
  // ★ include から select に変更し、必要なフィールドを明示するのを推奨 ★
  select: {
    id: true,
    content: true,
    createdAt: true,
    author: {
      // author は Post.tsx で必要
      select: userSnippetSelect,
    },
    _count: {
      // replies の count は Post に紐づく
      select: { replies: true },
    },
    // ★ updatedAt, authorId は Post.tsx で使わないので、ここでは含めない ★
    // ★ likes は Post にもう存在しないので含めない ★
  },
  // --- include を使う場合の例 (author: true のまま、likes を削除) ---
  // include: {
  //   author: true, // author は全フィールド取得
  //   // likes: { select: { userId: true } }, // ← 削除！
  //   _count: {
  //     select: { replies: true },
  //   },
  // },
});

// 上記 payload に基づく投稿の型エイリアス (export する)
export type PostWithData = Prisma.PostGetPayload<typeof postPayload>;

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
      // include: postPayload.include, // include を使う場合はこちら
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
