import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/client'
import { auth } from '@clerk/nextjs/server'
import { getUserDbIdByClerkId } from '@/lib/data/userQueries'

export async function GET(request: NextRequest, context: any) {
  const { subject } = context.params
  const comments = await prisma.averageItemComment.findMany({
    where: { subject },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      subject: true,
      userId: true,
      content: true,
      createdAt: true,
      user: { select: { username: true, name: true } },
    },
  })
  return NextResponse.json(
    comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
  )
}

export async function POST(request: NextRequest, context: any) {
  const { subject } = context.params
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userDbId = await getUserDbIdByClerkId(clerkId)
  if (!userDbId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { content } = await request.json()
  const created = await prisma.averageItemComment.create({
    data: { subject, content, userId: userDbId },
    select: {
      id: true,
      subject: true,
      userId: true,
      content: true,
      createdAt: true,
      user: { select: { username: true, name: true } },
    },
  })
  return NextResponse.json(
    { ...created, createdAt: created.createdAt.toISOString() },
    { status: 201 }
  )
}
