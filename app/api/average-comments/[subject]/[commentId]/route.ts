//app/api/average-comments/[subject]/[commentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/client'
import { auth } from '@clerk/nextjs/server'
import { getUserDbIdByClerkId } from '@/lib/data/userQueries'

export async function DELETE(request: NextRequest, context: any) {
  const { subject, commentId } = context.params as { subject: string; commentId: string }
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userDbId = await getUserDbIdByClerkId(clerkId)
  if (!userDbId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const existing = await prisma.averageItemComment.findUnique({
    where: { id: commentId },
    select: { userId: true, subject: true },
  })
  if (!existing || existing.subject !== subject || existing.userId !== userDbId) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  await prisma.averageItemComment.delete({ where: { id: commentId } })
  return new NextResponse(null, { status: 204 })
}
