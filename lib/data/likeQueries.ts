import prisma from "@/lib/client";

//そのユーザーがそのランキングをいいねしているか
// @returns ユーザーがこのランキングをいいね済みなら true 
export async function getRankingListLikeStatus(
  rankingListId: string,
  userDbId: string
): Promise<boolean> {
  const count = await prisma.like.count({
    where: {
      userId: userDbId,
      rankingListId: rankingListId,
    },
  });
  return count > 0;
}
