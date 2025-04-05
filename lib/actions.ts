"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "./client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
// Sentiment Enum と Prisma エラー型をインポート
import { Sentiment, Prisma } from "@prisma/client";

// 状態返却用の型
type State = {
  error?: string;
  success: boolean;
  newListId?: string;
};

// Likeアクション用の型
type LikeState = {
  likes: string[];
  error?: string | undefined;
};

// ===== ランキングリストのテーマ(subject)に対する Zod スキーマ =====
// 日本語、英数字、半角スペースのみ許可する正規表現
const subjectAllowedCharsRegex = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;

const SubjectSchema = z
  .string()
  .trim() // 先頭・末尾の空白を除去
  .min(1, "ランキングのテーマを入力してください。") // 空白除去後に1文字以上かチェック
  .max(50, "テーマは50字以内で入力してください。") // 最大文字数を50に変更
  .regex(subjectAllowedCharsRegex, { // ★ 日本語、英数字、半角スペースのみ許可
    message: "テーマには日本語、英数字、半角スペースのみ使用できます。記号や絵文字は使用できません。",
  });


// ===== 新しい RankingList 作成アクション =====
export async function createRankingListAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  // 1. 認証ユーザーID (Clerk ID) を取得
  const { userId: clerkId } = auth();
  if (!clerkId) {
    // 認証されていない場合はエラーを返す
    console.warn("createRankingListAction: User is not authenticated.");
    return { success: false, error: "ログインしてください。" };
  }

  try {
    // 2. フォームデータを取得・検証
    const sentimentInput = formData.get("sentiment") as string;
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string | null;

    // Sentiment の値が Enum のメンバーかチェック
    let sentiment: Sentiment;
    if (sentimentInput === Sentiment.LIKE || sentimentInput === Sentiment.DISLIKE) {
      sentiment = sentimentInput;
    } else {
      // 不正な値の場合はバリデーションエラー
      throw new Error("感情の選択が無効です。");
    }

    // Subject を Zod でバリデーション
    const validatedSubject = SubjectSchema.parse(subject);

    // 3. Clerk ID から内部的な User ID (CUID) を取得 ★重要★
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true }, // 必要なのは DB の id だけ
    });

    if (!user) {
      // 通常は発生しないはずだが、DB と Clerk が同期していない場合のエラー
      console.error(`createRankingListAction: User with clerkId ${clerkId} not found in DB.`);
      throw new Error("データベースにユーザーが見つかりません。");
    }
    const authorDbId = user.id; // これが DB の User.id (CUID)

    // 4. データベースに RankingList を作成
    const newList = await prisma.rankingList.create({
      data: {
        sentiment: sentiment,
        subject: validatedSubject,
        description: description,
        authorId: authorDbId,
      },
    });

    console.log(`RankingList created (ID: ${newList.id}) by user (DB ID: ${authorDbId}, Clerk ID: ${clerkId})`);

    // 5. 関連パスのキャッシュを再検証 (例: ホーム `/` や プロフィールページ)
    revalidatePath("/");
    // 必要に応じてプロフィールページなども再検証
    // const authorProfile = await prisma.user.findUnique({ where: { id: authorDbId }, select: { username: true }});
    // if(authorProfile?.username) {
    //   revalidatePath(`/profile/${authorProfile.username}`);
    // }

    // 6. 成功レスポンスを返す
    return { success: true, newListId: newList.id };

  } catch (error) {
    console.error("Error creating ranking list:", error); // エラーログ

    // 7. エラーハンドリング
    if (error instanceof z.ZodError) {
      // Zod バリデーションエラー
      return {
        error: error.errors.map((e) => e.message).join("\n"), // 改行で連結
        success: false,
      };
    } else if (error instanceof Error) {
      // その他の JavaScript エラー
      return {
        success: false,
        error: error.message,
      };
    } else {
      // 予期せぬエラー
      return {
        success: false,
        error: "ランキングリストの作成中に予期せぬエラーが発生しました。",
      };
    }
  }
}

// --- 投稿作成アクション ---
export async function addPostAction(
  prevState: State,
  formData: FormData
): Promise<State> {
   const PostTextSchema = z
    .string()
    .min(1, "ポスト内容を入力してください。")
    .max(140, "140字以内で入力してください。");

  try {
    const postText = PostTextSchema.parse(formData.get("post") as string);

    const { userId: clerkId } = auth(); // Clerk ID を取得
    if (!clerkId) {
      return { success: false, error: "ログインしてください。" };
    }

    // ★ Clerk ID から内部的な User ID (CUID) を取得 ★
     const user = await prisma.user.findUnique({
       where: { clerkId: clerkId },
       select: { id: true },
     });
     if (!user) {
       console.error(`addPostAction: User with clerkId ${clerkId} not found in DB.`);
       throw new Error("データベースにユーザーが見つかりません。");
     }
     const authorDbId = user.id; // DB の User.id

    await prisma.post.create({
      data: {
        authorId: authorDbId, // ★ DB の User.id を使用 ★
        content: postText,
      },
    });

    console.log(`Post created by user (DB ID: ${authorDbId}, Clerk ID: ${clerkId})`);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
     console.error("Error adding post:", error);
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => e.message).join("\n"),
        success: false,
      };
    } else if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    } else {
      return {
        success: false,
        error: "投稿中に予期せぬエラーが発生しました。",
      };
    }
  }
}

// --- いいねアクション ---
export const likeAction = async (
  formData: FormData
): Promise<{ success: boolean; error?: string; likes?: string[] }> => { // 戻り値の型を少し明確化
  const { userId: clerkId } = auth(); // Clerk ID を取得
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  const postId = formData.get("postId") as string;
  if (!postId) {
     return { success: false, error: "投稿IDが指定されていません。" };
  }

  try {
    // ★ Clerk ID から内部的な User ID (CUID) を取得 ★
     const user = await prisma.user.findUnique({
       where: { clerkId: clerkId },
       select: { id: true },
     });
     if (!user) {
       console.error(`likeAction: User with clerkId ${clerkId} not found in DB.`);
       throw new Error("データベースにユーザーが見つかりません。");
     }
     const userDbId = user.id; // DB の User.id

    // 既存のいいねを検索 (userId と postId の組み合わせで一意)
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
            userId: userDbId, // ★ DB の User.id を使用 ★
            postId: postId,
        }
      },
    });

    if (existingLike) {
      // --- いいね削除 ---
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: userDbId, // ★ DB の User.id を使用 ★
            postId: postId,
          }
        },
      });
      console.log(`Like removed by user (DB ID: ${userDbId}) for post ${postId}`);
    } else {
      // --- いいね作成 ---
      await prisma.like.create({
        data: {
          postId: postId,
          userId: userDbId, // ★ DB の User.id を使用 ★
        },
      });
      console.log(`Like added by user (DB ID: ${userDbId}) for post ${postId}`);
    }

    revalidatePath("/"); // または revalidateTag などで関連データを再検証

    // 成功時は現在のいいね状態などを返せると良いが、ここではシンプルに成功のみ返す
    return { success: true };

  } catch (err) {
    console.error("Error in likeAction:", err);
    return { success: false, error: "いいねの処理中にエラーが発生しました。" };
  }
};

// --- フォローアクション ---
export const followAction = async (
    clerkIdToFollow: string // フォロー対象の Clerk ID
): Promise<{ success: boolean; error?: string }> => {
  const { userId: currentClerkId } = auth(); // 自分の Clerk ID

  if (!currentClerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  if (!clerkIdToFollow) {
     return { success: false, error: "フォロー対象のユーザーが指定されていません。" };
  }
  if (currentClerkId === clerkIdToFollow) {
      return { success: false, error: "自分自身をフォローすることはできません。" };
  }

  try {
    // ★ Clerk ID からそれぞれの内部的な User ID (CUID) を取得 ★
    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({
        where: { clerkId: currentClerkId },
        select: { id: true, username: true } // 自分の username も取得 (revalidate用)
      }),
      prisma.user.findUnique({
        where: { clerkId: clerkIdToFollow },
        select: { id: true, username: true } // 相手の username も取得 (revalidate用)
      })
    ]);

    if (!currentUser || !targetUser) {
        console.error(`followAction: Current user (${currentClerkId}) or target user (${clerkIdToFollow}) not found in DB.`);
        throw new Error("データベースにユーザーが見つかりません。");
    }
    const followerDbId = currentUser.id; // 自分の DB ID
    const followingDbId = targetUser.id; // 相手の DB ID

    // 既存のフォロー関係を検索 (DB ID ベースで)
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerDbId, // ★ DB の User.id を使用 ★
          followingId: followingDbId, // ★ DB の User.id を使用 ★
        },
      },
    });

    if (existingFollow) {
      // --- アンフォロー処理 ---
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: followerDbId, // ★ DB の User.id を使用 ★
            followingId: followingDbId, // ★ DB の User.id を使用 ★
          },
        },
      });
      console.log(`User (DB ID: ${followerDbId}) unfollowed user (DB ID: ${followingDbId})`);
    } else {
      // --- フォロー処理 ---
      await prisma.follow.create({
        data: {
          followerId: followerDbId, // ★ DB の User.id を使用 ★
          followingId: followingDbId, // ★ DB の User.id を使用 ★
        },
      });
       console.log(`User (DB ID: ${followerDbId}) followed user (DB ID: ${followingDbId})`);
    }

    // 関連するプロフィールページを再検証
    if (targetUser.username) {
        revalidatePath(`/profile/${targetUser.username}`);
    }
    if (currentUser.username) {
      revalidatePath(`/profile/${currentUser.username}`);
    }
    // ホームタイムラインなども影響する可能性があるため
    revalidatePath('/');

    return { success: true };

  } catch (err) {
    console.error("Error in followAction:", err);
     return { success: false, error: "フォロー処理中にエラーが発生しました。" };
  }
};