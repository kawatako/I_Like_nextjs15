// app/api/ranking-comments/[listId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/client'
import { auth } from '@clerk/nextjs/server'

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
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content } = await request.json()
  const created = await prisma.rankingListComment.create({
    data: { listId, userId, content },
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
  return NextResponse.json(
    { ...created, createdAt: created.createdAt.toISOString() },
    { status: 201 }
  )
}
