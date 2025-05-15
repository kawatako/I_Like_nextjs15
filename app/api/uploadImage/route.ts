// app/api/uploadImage/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { headers: {} } }
    )

    // multipart/form-data を想定
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'ファイルが送信されていません' }, { status: 400 })
    }

    // ファイルサイズ制限: 5MB
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ファイルサイズは5MB以内にしてください' }, { status: 413 })
    }

    // 拡張子チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'JPEG/PNG/WebP形式の画像をアップロードしてください' }, { status: 415 })
    }

    // 一意のパス生成
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `${userId}/${fileName}`

    // Storage にアップロード
    const { data, error } = await supabase.storage
      .from('i-like')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'アップロード失敗' }, { status: 500 })
    }

    // 署名付き URL を生成 (1時間 有効)
    const { data: signedData, error: signErr } = await supabase.storage
      .from('i-like')
      .createSignedUrl(data.path, 60 * 60)
    if (signErr || !signedData) {
      return NextResponse.json(
        { error: '署名付き URL の生成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ publicUrl: signedData.signedUrl })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
