// app/api/ranking-comments/[listId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/client'
import { auth } from '@clerk/nextjs/server'
import { getUserDbIdByClerkId } from '@/lib/data/userQueries'

export async function GET(request: NextRequest, context: any) {
  const { listId } = context.params
  const comments = await prisma.rankingListComment.findMany({
    where: { listId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      listId: true,
      userId: true,
      content: true,
      createdAt: true,
      user: {
        select: { username: true, name: true },
      },
    },
  })
  const payload = comments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }))
  return NextResponse.json(payload)
}

export async function POST(request: NextRequest, context: any) {
  const { listId } = context.params

  // 1) Clerk の userId → DB の userDbId に変換
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userDbId = await getUserDbIdByClerkId(clerkId)
  if (!userDbId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 2) リクエストボディから content を取得
  const { content } = await request.json()

  // 3) コメントを作成（userId に DB 内部 ID をセット）
  const created = await prisma.rankingListComment.create({
    data: {
      listId,
      userId: userDbId,
      content,
    },
    select: {
      id: true,
      listId: true,
      userId: true,
      content: true,
      createdAt: true,
      user: {
        select: { username: true, name: true },
      },
    },
  })

  // 4) JSON で返す（日時は文字列化）
  return NextResponse.json(
    { ...created, createdAt: created.createdAt.toISOString() },
    { status: 201 }
  )
}
