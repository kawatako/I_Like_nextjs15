import prisma from "../client";

interface UserData {
  id: string;
  username: string | null;
  image: string | null;
}

export async function getCurrentLoginUserData(
  userId: string
): Promise<UserData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      image: true,
    },
  });
  return user;
}
