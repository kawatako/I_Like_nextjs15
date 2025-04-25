// app/profile/[username]/edit/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client"; // Prisma Client をインポート
import ProfileEditForm from "@/components/component/profiles/ProfileEditForm"; // 作成したフォームコンポーネントをインポート
import type { User } from "@prisma/client"; // User 型

// 編集フォームが必要とするデータの型 (ProfileEditForm と合わせる)
// lib/types.ts に定義しても良い
type UserDataForEdit = Pick<
  User,
  'username' | 'name' | 'bio' | 'location' | 'birthday' | 'image' | 'coverImageUrl' | 'socialLinks'
>;

type SessionClaimsWithUsername = {
  metadata?: {
    username?: string;
  };
};

// ページコンポーネントの Props 型
interface ProfileEditPageProps {
  params: { username: string };
}

export default async function ProfileEditPage({ params: paramsProp }: ProfileEditPageProps) {
  // Next.js 15: params を await する
  const params = await paramsProp;
  const targetUsername = params.username;

  // 1. 認証情報取得
  const { userId: loggedInClerkId, sessionClaims } = await auth();

  // ログインしていない場合は編集不可 (通常は Clerk のミドルウェアで保護されるはずだが念のため)
  if (!loggedInClerkId) {
    // redirect('/sign-in'); // または notFound() など
    notFound();
  }

  // ★ Clerk のセッション情報からログインユーザーの username を取得 ★
  //   セッションに username が含まれていない場合は Clerk Dashboard で設定を確認
  const claims = sessionClaims as SessionClaimsWithUsername;
  const loggedInUsername = claims?.metadata?.username ?? await getUsernameFromDb(loggedInClerkId);

  if (!loggedInUsername) {
     console.error("Could not retrieve username for logged in user:", loggedInClerkId);
     notFound(); // ログインユーザー名が取得できない場合
  }


  // 2. 編集権限チェック (URL の username とログインユーザーの username を比較)
  if (targetUsername !== loggedInUsername) {
    console.warn(`Permission denied: User ${loggedInUsername} cannot edit profile of ${targetUsername}`);
    notFound(); // 自分以外のプロフィールは編集させない
  }

  // 3. 編集対象の現在のプロフィールデータを取得
  //    ProfileEditForm が必要とするフィールドを選択
  const userProfileData = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: {
      username: true,
      name: true,
      bio: true,
      location: true,
      birthday: true,
      image: true,
      coverImageUrl: true,
      socialLinks: true,
    }
  });

  // データが見つからない場合も 404
  if (!userProfileData) {
    notFound();
  }

  // 4. 編集フォームコンポーネントをレンダリングし、初期データを渡す
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl"> {/* レイアウト調整用コンテナ */}
      <h1 className="text-3xl font-bold mb-6">プロフィールを編集</h1>
      <ProfileEditForm initialData={userProfileData as UserDataForEdit} /> {/* 型アサーションが必要な場合あり */}
    </div>
  );
}


// ★ Clerk ID から username を取得するヘルパー関数 (必要なら userQueries.ts などに) ★
async function getUsernameFromDb(clerkId: string): Promise<string | null> {
   try {
     const user = await prisma.user.findUnique({
       where: { clerkId: clerkId },
       select: { username: true },
     });
     return user?.username ?? null;
   } catch (error) {
     console.error("Error fetching username from DB:", error);
     return null;
   }
}