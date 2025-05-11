// app/profile/[username]/page.tsx
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries"
import { getFollowStatus } from "@/lib/actions/followActions"
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader"
import ProfileTabsClient from "./tabs/ProfileTabsClient"
import type { UserProfileData } from "@/lib/types"

export const dynamic = 'force-dynamic'; // disable static generation to use runtime env

export default async function ProfilePage({ params, searchParams }: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { username } = await params
  const sp = await searchParams

  // Service Role Key を使った Supabase 管理クライアントを関数内で初期化
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ensure env var defined in deployment
  )

  // 認証ユーザーを取得
  const { userId: currentClerkId } = await auth()

  // DB からユーザー情報を取得
  const userProfileData = await getUserProfileData(username)
  if (!userProfileData) notFound()

  // Public URL からバケット内キーだけを取り出すヘルパー
  function extractKey(publicUrl: string): string | null {
    try {
      const urlObj = new URL(publicUrl)
      const prefix = "/storage/v1/object/public/i-like/"
      if (urlObj.pathname.startsWith(prefix)) {
        return urlObj.pathname.slice(prefix.length)
      }
      return null
    } catch {
      return null
    }
  }

  // プロフィール画像の署名付き URL を生成
  let profileImageUrl: string | null = null
  if (userProfileData.image) {
    const key = extractKey(userProfileData.image)
    if (key) {
      const { data, error } = await supabaseAdmin.storage
        .from("i-like")
        .createSignedUrl(key, 60 * 60 * 24)
      if (error) console.error("Signed URL生成失敗 (profile):", error)
      else profileImageUrl = data.signedUrl
    }
  }

  // カバー画像の署名付き URL を生成
  let coverImageUrl: string | null = null
  if (userProfileData.coverImageUrl) {
    const key = extractKey(userProfileData.coverImageUrl)
    if (key) {
      const { data, error } = await supabaseAdmin.storage
        .from("i-like")
        .createSignedUrl(key, 60 * 60 * 24)
      if (error) console.error("Signed URL生成失敗 (cover):", error)
      else coverImageUrl = data.signedUrl
    }
  }

  // Signed URL を含めたデータ構造にマージ
  const headerUserData: UserProfileData = {
    ...userProfileData,
    image: profileImageUrl,
    coverImageUrl: coverImageUrl,
  }

  // フォロー情報やタブ状態の取得
  const isCurrentUser = currentClerkId === userProfileData.clerkId
  const targetUserDbId = userProfileData.id
  const loggedInUserDbId = currentClerkId
    ? await getUserDbIdByClerkId(currentClerkId)
    : null
  const followStatusInfo = await getFollowStatus(
    loggedInUserDbId,
    targetUserDbId
  )

  const currentTab =
    typeof sp.tab === "string" && ["title", "item", "tag"].includes(sp.tab)
      ? (sp.tab as "title" | "item" | "tag")
      : undefined

  return (
    <>
      <ProfileHeader
        userProfileData={headerUserData}
        isCurrentUser={isCurrentUser}
        initialFollowStatus={followStatusInfo}
      />
      <ProfileTabsClient
        username={userProfileData.username}
        isCurrentUser={isCurrentUser}
        initialTab={currentTab}
        targetUserId={targetUserDbId}
        loggedInUserDbId={loggedInUserDbId}
      />
    </>
  )
}
