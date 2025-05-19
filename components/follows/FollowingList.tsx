// components/follows/FollowingList.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "@/components/Icons";
import { getPaginatedFollowing } from "@/lib/actions/followActions";
import type { UserSnippet } from "@/lib/types";

interface Props {
  targetUserId: string;
}

const ITEMS_PER_PAGE = 20;

export function FollowingList({ targetUserId }: Props) {
  const [items, setItems] = useState<UserSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.5 });

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const res = await getPaginatedFollowing({
      targetUserId,
      limit: ITEMS_PER_PAGE,
      cursor: nextCursor ?? undefined,
    });
    setItems((prev) => [...prev, ...res.items]);
    setNextCursor(res.nextCursor);
    setHasMore(res.nextCursor !== null);
    setIsLoading(false);
    setInitialLoaded(true);
  }, [targetUserId, nextCursor, isLoading, hasMore]);

  useEffect(() => {
    if (!initialLoaded) loadMore();
  }, [initialLoaded, loadMore]);

  useEffect(() => {
    if (inView && initialLoaded && hasMore && !isLoading) {
      loadMore();
    }
  }, [inView, initialLoaded, hasMore, isLoading, loadMore]);

  return (
    <div>
      {initialLoaded && items.length === 0 && (
        <p className='text-center py-10'>フォロー中のユーザーはいません</p>
      )}
      <ul className='space-y-3'>
        {items.map((user) => (
          <li key={user.id}>
            <Link
              href={`/profile/${user.username}`}
              className='flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors'
            >
              <Avatar className='w-10 h-10'>
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? user.username}
                />
                <AvatarFallback>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold'>{user.name ?? user.username}</p>
                {user.name && (
                  <p className='text-sm text-muted-foreground'>
                    @{user.username}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {isLoading && (
        <div className='flex justify-center py-6'>
          <Loader2 className='animate-spin' />
        </div>
      )}
      {!isLoading && hasMore && <div ref={ref} className='h-10' />}
    </div>
  );
}
