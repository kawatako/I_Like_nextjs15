// app/profile/[username]/page.tsx (最終版)

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
// 関連するデータ取得関数と型をインポート
import { getUserProfileData, getDraftRankingLists, type RankingListForProfile } from "@/lib/user/userService";
import { getLikedPosts, type PostWithAuthor } from "@/lib/like/likeService"; // likeService から PostWithAuthor をインポート
import { fetchPosts } from "@/lib/post/postService"; // fetchPosts からも PostWithAuthor を返す想定
// UI コンポーネントをインポート
import { ProfileTabs } from "@/components/component/profile/ProfileTabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
// import FollowButton from "@/components/component/FollowButton";

// このページは動的レンダリングを指定
export const dynamic = 'force-dynamic';

// Props の型定義
interface ProfilePageProps {
  params: { username: string };
  // searchParams は ProfileTabs で処理するのでここでは不要
}

// 関数の引数で params を受け取る
export default async function ProfilePage({ params }: ProfilePageProps) {

  // ★★★ 公式ドキュメントの例に従い、params を await してから username を取り出す ★★★
  const { username } = await params;
  // ★★★ ------------------------------------------------------------- ★★★

  // 現在のログインユーザー情報を取得
  const { userId: currentClerkId } = await auth();

  // --- データ取得 ---
  const userProfileData = await getUserProfileData(username);
  if (!userProfileData) {
    notFound(); // ユーザーが見つからなければ 404
  }

  // 表示中のプロフィールが自分自身か判定
  const isCurrentUser = currentClerkId === userProfileData.clerkId;
  // DB 操作や Props で使うための内部 ID
  const userDbId = userProfileData.id;

  // ユーザーの投稿を取得 (fetchPosts は userDbId で取得する想定)
  const userPosts: PostWithAuthor[] = await fetchPosts(userDbId);

  // いいねした投稿を取得 (自分自身の場合のみ)
  let likedPosts: PostWithAuthor[] = [];
  if (isCurrentUser) {
    likedPosts = await getLikedPosts(userDbId);
  }

  // 下書きのランキングリストを取得 (自分自身の場合のみ)
  let draftLists: RankingListForProfile[] = [];
  if (isCurrentUser) {
    draftLists = await getDraftRankingLists(userDbId);
  }
  // ------------------

  // --- レンダリング ---
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
      {/* --- プロフィールヘッダー --- */}
      <section className="mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 justify-between">
         <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border">
              <AvatarImage src={userProfileData.image ?? undefined} alt={`${userProfileData.username} のプロフィール画像`} />
              <AvatarFallback>{userProfileData.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              {/* ★ username は userProfileData から取得したものを使用 ★ */}
              <h1 className="text-2xl sm:text-3xl font-bold">{userProfileData.name || userProfileData.username}</h1>
              <p className="text-muted-foreground">@{userProfileData.username}</p>
              {userProfileData.bio && <p className="mt-2 text-sm">{userProfileData.bio}</p>}
              {/* TODO: フォロワー数などの表示 */}
            </div>
         </div>
         <div className="mt-4 sm:mt-0">
             {/* TODO: プロフィール編集ページへのリンクを設定 */}
            {isCurrentUser ? (
               <Link href="/settings/profile"> {/* 例: 設定ページへのリンク */}
                 <Button variant="outline">プロフィールを編集</Button>
               </Link>
            ) : currentClerkId ? (
               // <FollowButton profileUserId={userProfileData.clerkId} /> // FollowButton 実装後
               <Button variant="outline" disabled>フォロー(仮)</Button>
            ) : (
               <Button variant="outline" disabled>フォロー</Button>
            )}
         </div>
      </section>
      {/* --- プロフィールヘッダーここまで --- */}


      {/* --- タブ表示部分 (ProfileTabs コンポーネントに委譲) --- */}
      <ProfileTabs
        userId={userDbId}
        username={userProfileData.username} // ★ DBから取得した username を渡す
        publishedLists={userProfileData.rankingLists ?? []} // 公開済みリスト
        draftLists={draftLists ?? []} // 下書きリスト (自分のみ)
        userPosts={userPosts ?? []}   // 投稿
        likedPosts={likedPosts ?? []} // いいね (自分のみ)
        isCurrentUser={isCurrentUser} // 本人かどうかのフラグ
      />
      {/* --- タブ表示ここまで --- */}
    </div>
  );
}