// app/profile/[username]/edit/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import ProfileEditForm from "@/components/component/profiles/ProfileEditForm";
import { getUsernameFromDb } from "@/lib/data/userQueries";

// ページコンポーネントの Props 型
interface ProfileEditPageProps {
  // Next.js 15 以降は params が Promise になるので Promise<…> とする
  params: Promise<{ username: string }>;
}

export default async function ProfileEditPage({
  params,
}: ProfileEditPageProps) {
  // Promise を解決してからパラメータを取得
  const { username: targetUsername } = await params;

  // 1. 認証情報を取得
  const { userId: clerkId, sessionClaims } = await auth();
  if (!clerkId) {
    return notFound();
  }

  // 2. Clerk セッションのメタデータから username を取り出す
  type SessionClaimsWithUsername = { metadata?: { username?: string } };
  const claims = sessionClaims as SessionClaimsWithUsername;
  const loggedInUsername =
    claims?.metadata?.username ?? (await getUsernameFromDb(clerkId));

  // ログインユーザー名が取れない or URL の username と一致しない → 404
  if (!loggedInUsername || loggedInUsername !== targetUsername) {
    return notFound();
  }

  // 3. 編集対象ユーザーの現在データを取得
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
    },
  });

  if (!userProfileData) {
    return notFound();
  }

  // 4. フォームに初期データを渡してレンダリング
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">プロフィールを編集</h1>
      <ProfileEditForm initialData={userProfileData} />
    </div>
  );
}
