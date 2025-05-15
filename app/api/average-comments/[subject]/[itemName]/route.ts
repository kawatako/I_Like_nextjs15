// app/api/average-comments/[subject]/[itemName]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/client';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  context: any
) {
  const { subject, itemName } = context.params;
  const comments = await prisma.averageItemComment.findMany({
    where: { subject, itemName },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  context: any
) {
  const { subject, itemName } = context.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { content } = await request.json();
    const created = await prisma.averageItemComment.create({
      data: { subject, itemName, userId, content },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}