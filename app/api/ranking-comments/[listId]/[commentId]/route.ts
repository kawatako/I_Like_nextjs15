// app/api/ranking-comments/[listId]/[commentId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/client'
import { auth } from '@clerk/nextjs/server'
import { getUserDbIdByClerkId } from '@/lib/data/userQueries'

export async function DELETE(request: NextRequest, context: any) {
  const { listId, commentId } = context.params as { listId: string; commentId: string }

  // 1) Clerk の userId を取得
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) DB 内部の userId にマッピング
  const userDbId = await getUserDbIdByClerkId(clerkId)
  if (!userDbId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 3) コメントが存在し、自分のものかチェック
  const existing = await prisma.rankingListComment.findUnique({
    where: { id: commentId },
    select: { userId: true, listId: true },
  })
  if (
    !existing ||
    existing.listId !== listId ||
    existing.userId !== userDbId
  ) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  // 4) 削除実行
  await prisma.rankingListComment.delete({
    where: { id: commentId },
  })

  // 5) 成功レスポンス（Content-Length: 0 になるため 204 が好ましい）
  return new NextResponse(null, { status: 204 })
}
