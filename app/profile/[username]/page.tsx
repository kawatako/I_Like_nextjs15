import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import PostList from "@/components/component/PostList";
import prisma from "@/lib/client";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import FollowButton from "@/components/component/FollowButton";

//https://github.com/safak/next-social/blob/completed/src/components/rightMenu/UserInfoCardInteraction.tsx

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username;
  const { userId: currentUserId } = auth();

  if (!currentUserId) {
    notFound();
  }

  const user = await prisma.user.findFirst({
    where: {
      username,
    },
    include: {
      _count: {
        select: {
          following: true,
          followedBy: true,
          posts: true,
        },
      },
      followedBy: {
        where: {
          followerId: currentUserId,
        },
      },
    },
  });

  if (!user) {
    return notFound();
  }

  const isCurrentUser = currentUserId === user.id;
  const isFollowing = user.followedBy.length > 0;

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1">
        <div className="container py-6 md:py-10 lg:py-12">
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <div>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24 mb-4 md:mb-0">
                  <AvatarImage
                    src={user.image || "/placeholder-user.jpg"}
                    alt="Acme Inc Profile"
                  />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{user.username}</h1>
                  <div className="text-muted-foreground">@{user.username}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-muted-foreground">
                <div>
                  <MapPinIcon className="w-4 h-4 mr-1 inline" />
                  xxxxxxxxx
                </div>
                <div>
                  <LinkIcon className="w-4 h-4 mr-1 inline" />
                  xxxxxx.com
                </div>
              </div>
              <div className="mt-6 flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold">{user._count.posts}</div>
                  <div className="text-muted-foreground">Posts</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold">
                    {user._count.following}
                  </div>
                  <div className="text-muted-foreground">Followers</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold">
                    {user._count.followedBy}
                  </div>
                  <div className="text-muted-foreground">Following</div>
                </div>
              </div>

              <div className="mt-6 h-[500px] overflow-y-auto">
                <PostList username={username} />
              </div>
            </div>
            <div className="sticky top-14 self-start space-y-6">
              <FollowButton
                isFollowing={isFollowing}
                userId={user.id}
                isCurrentUser={isCurrentUser}
              />
              <div>
                <h3 className="text-lg font-bold">Suggested</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Acme Inc</div>
                      <div className="text-muted-foreground text-sm">
                        @acmeinc
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Acme Inc</div>
                      <div className="text-muted-foreground text-sm">
                        @acmeinc
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Acme Inc</div>
                      <div className="text-muted-foreground text-sm">
                        @acmeinc
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LinkIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function MapPinIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MountainIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function MoveHorizontalIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 8 22 12 18 16" />
      <polyline points="6 8 2 12 6 16" />
      <line x1="2" x2="22" y1="12" y2="12" />
    </svg>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
