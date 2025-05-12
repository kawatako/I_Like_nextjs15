// app/rankings/[listId]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { getRankingDetailsForView } from "@/lib/data/rankingQueries"
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries"
import { getFollowStatus } from "@/lib/actions/followActions"
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader"
import { RankingDetailView } from "@/components/component/rankings/RankingDetailView"
import { Button } from "@/components/ui/button"

// Edge Runtime かつ動的データを扱うので静的生成を無効化
export const dynamic = 'force-dynamic'

export default async function RankingDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params

  // Supabase 管理クライアントを関数内で初期化
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1) ランキング本体取得
  const raw = await getRankingDetailsForView(listId)
  if (!raw) return notFound()

  // 2) 投稿者プロフィール取得
  const userProfileData = await getUserProfileData(raw.author.username)
  if (!userProfileData) return notFound()

  // 3) isOwner 判定
  const { userId: clerkUserId } = await auth()
  const isOwner = clerkUserId === userProfileData.clerkId

  // 4) フォロー状態取得
  const followStatusInfo = await getFollowStatus(
    clerkUserId ? await getUserDbIdByClerkId(clerkUserId) : null,
    userProfileData.id
  )

  // 画像キー抽出ヘルパー
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

  // ヘッダー／カバー画像の署名付きURLを生成
  let profileImageUrl: string | null = null
  if (userProfileData.image) {
    const key = extractKey(userProfileData.image)
    if (key) {
      const { data, error } = await supabaseAdmin.storage
        .from("i-like")
        .createSignedUrl(key, 60 * 60 * 24)
      if (error) console.error("Signed URL生成失敗 (header):", error)
      else profileImageUrl = data.signedUrl
    }
  }

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

  // 確認用ログ
  console.log("▶️ HEADER imgURL:", profileImageUrl)
  console.log("▶️ COVER  imgURL:", coverImageUrl)

  // ProfileHeader に渡す用にデータをマージ
  const headerUserData = {
    ...userProfileData,
    image: profileImageUrl,
    coverImageUrl: coverImageUrl,
  }

  // アイテム画像に署名付きURLを生成
  const itemsWithSigned = await Promise.all(
    raw.items.map(async (item) => {
      let signedUrl: string | null = null
      if (item.imageUrl && !item.imageUrl.startsWith("blob:")) {
        const key = extractKey(item.imageUrl)
        if (key) {
          const { data, error } = await supabaseAdmin.storage
            .from("i-like")
            .createSignedUrl(key, 60 * 60 * 24)
          if (error) console.error("Signed URL生成失敗 (item):", error)
          else signedUrl = data.signedUrl
        }
      }
      return { ...item, imageUrl: signedUrl ?? item.imageUrl }
    })
  )

  // 署名付きURL入りのランキングデータ
  const rankingWithSigned = { ...raw, items: itemsWithSigned }

  return (
    <>
      {/* プロフィールヘッダー */}
      <ProfileHeader
        userProfileData={headerUserData}
        isCurrentUser={isOwner}
        initialFollowStatus={followStatusInfo}
      />

      {/* ランキング詳細 */}
      <RankingDetailView ranking={rankingWithSigned} isOwner={isOwner} />

      {/* オーナーだけに表示する「編集する」 */}
      {isOwner && (
        <div className="mb-4 flex justify-end px-4">
          <Link href={`/rankings/${listId}/edit`}>
            <Button variant="outline">編集する</Button>
          </Link>
        </div>
      )}
    </>
  )
}
