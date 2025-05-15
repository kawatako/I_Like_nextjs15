// app/profile/[username]/edit/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProfileEditForm from '@/components/component/profiles/ProfileEditForm'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSignedUrl(path: string) {
  const { data, error } = await supabaseAdmin
    .storage
    .from('i-like')
    .createSignedUrl(path, 60 * 60)
  if (error || !data) return null
  return data.signedUrl
}

export default async function EditPage(context: any) {
  const { username } = context.params

  // ユーザー情報取得
  const { data: user, error } = await supabaseAdmin
    .from('user')
    .select(`
      name,
      bio,
      location,
      birthday,
      image,
      coverImageUrl,
      socialLinks,
      username
    `)
    .eq('username', username)
    .single()

  if (error || !user) {
    notFound()
  }

  // プレビュー用署名付き URL を生成
  const imageUrl = user.image ? await getSignedUrl(user.image) : null
  const coverUrl = user.coverImageUrl ? await getSignedUrl(user.coverImageUrl) : null

  return (
    <ProfileEditForm
      initialData={{
        name: user.name,
        bio: user.bio,
        location: user.location,
        // ProfileEditForm 側で date → string に変換するのでここは string|null
        birthday: user.birthday?.toISOString().split('T')[0] ?? null,
        image: imageUrl,
        coverImageUrl: coverUrl,
        socialLinks: user.socialLinks,
        username: user.username,
      }}
    />
  )
}
