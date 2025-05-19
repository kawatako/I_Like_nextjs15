// app/profile/[username]/edit/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProfileEditForm from '@/components/profiles/ProfileEditForm'
import prisma from '@/lib/client'
import { supabaseAdmin } from '@/lib/utils/storage'

async function getSignedUrl(path: string) {
  const { data, error } = await supabaseAdmin
    .storage
    .from('i-like')
    .createSignedUrl(path, 60 * 60) // 1時間有効
  if (error || !data) return null
  return data.signedUrl
}

export default async function EditPage({
  params,
}: {
  // Next.js15 では params が Promise になりました
  params: Promise<{ username: string }>
}) {
  // Promise を await して中身を取り出す
  const { username } = await params

  // Prisma でユーザー情報を取得
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      name: true,
      bio: true,
      location: true,
      birthday: true,         // Date | null
      image: true,            // ストレージのパス
      coverImageUrl: true,    // ストレージのパス
      socialLinks: true,
      username: true,
    },
  })

  if (!user) {
    notFound()
  }

  // プライベートバケット用の署名付き URL を生成
  const imageUrl = user.image
    ? await getSignedUrl(user.image)
    : null
  const coverUrl = user.coverImageUrl
    ? await getSignedUrl(user.coverImageUrl)
    : null

  return (
    <ProfileEditForm
      initialData={{
        name: user.name,
        bio: user.bio,
        location: user.location,
        birthday: user.birthday,     // Date | null のまま渡す
        image: imageUrl,
        coverImageUrl: coverUrl,
        socialLinks: user.socialLinks,
        username: user.username,
      }}
    />
  )
}
