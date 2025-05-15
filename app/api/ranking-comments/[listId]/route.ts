// app/api/ranking-comments/[listId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/client';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest, context: any) {
  const { listId } = context.params;
  const comments = await prisma.rankingListComment.findMany({
    where: { listId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(comments);
}

export async function POST(request: NextRequest, context: any) {
  const { listId } = context.params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { content } = await request.json();
  const created = await prisma.rankingListComment.create({
    data: {
      listId,
      userId,
      content,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
