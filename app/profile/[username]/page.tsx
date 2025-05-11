// app/profile/[username]/page.tsx
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries"
import { getFollowStatus } from "@/lib/actions/followActions"
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader"
import ProfileTabsClient from "./tabs/ProfileTabsClient"
import type { UserProfileData } from "@/lib/types"

interface ProfilePageProps {
  params: { username: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

// Service Role Key を使った管理用 Supabase クライアント
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { username } = params
  const sp = searchParams

  // 認証ユーザーを取得
  const { userId: currentClerkId } = await auth()

  // DB からユーザー情報を取得
  const userProfileData = await getUserProfileData(username)
  if (!userProfileData) notFound()

  // Public URL からバケット内キーだけを取り出すヘルパー
  function extractKey(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl)
      const prefix = "/storage/v1/object/public/i-like/"
      if (url.pathname.startsWith(prefix)) {
        return url.pathname.slice(prefix.length)
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
      if (data) profileImageUrl = data.signedUrl
      if (error) console.error("Signed URL生成失敗 (profile):", error)
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
      if (data) coverImageUrl = data.signedUrl
      if (error) console.error("Signed URL生成失敗 (cover):", error)
    }
  }

  // 取得した署名付き URL を userProfileData にマージ
  const headerUserData: UserProfileData = {
    ...userProfileData,
    image: profileImageUrl,
    coverImageUrl: coverImageUrl,
  }

  // フォロー情報やタブ状態
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
