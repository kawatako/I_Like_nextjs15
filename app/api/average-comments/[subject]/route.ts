// app/api/average-comments/[subject]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/client'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest, context: any) {
  const { subject } = context.params
  const comments = await prisma.averageItemComment.findMany({
    where: { subject },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(request: NextRequest, context: any) {
  const { subject } = context.params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()
  const created = await prisma.averageItemComment.create({
    data: { subject, content, userId },
  })
  return NextResponse.json(created, { status: 201 })
}
