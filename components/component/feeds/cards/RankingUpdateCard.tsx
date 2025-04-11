// components/component/feeds/cards/RankingUpdateCard.tsx

import Link from "next/link";
import Image from "next/image"; // next/image を使用
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HeartIcon,
  MessageCircleIcon,
  RepeatIcon,
  ShareIcon,
  StarIcon,
} from "@/components/component/Icons";
import type { FeedItemWithRelations } from "@/lib/data/feedQueries";
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";

type RankingUpdateCardItem = Omit<
  FeedItemWithRelations,
  "retweetOfFeedItem" | "quotedFeedItem"
>;

interface RankingUpdateCardProps {
  item: RankingUpdateCardItem;
}

export default function RankingUpdateCard({ item }: RankingUpdateCardProps) {
  if (item.type !== "RANKING_UPDATE" || !item.rankingList) {
    return null;
  }

  const user = item.user;
  const rankingList = item.rankingList;

  const timeAgo = formatDistanceToNowStrict(new Date(item.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div className='flex space-x-3 border-b p-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50'>
      {/* Left: Avatar */}
      <div>
        <Link href={`/profile/${user.username}`}>
          <Avatar>
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback>
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>

      {/* Right: Content */}
      <div className='flex-1 space-y-1'>
        {/* Header: User Info & Timestamp */}
        <div className='flex items-center space-x-1 text-sm'>
          <Link
            href={`/profile/${user.username}`}
            className='font-semibold hover:underline'
          >
            {user.name ?? user.username}
          </Link>
          <span className='text-gray-500 dark:text-gray-400'>
            @{user.username}
          </span>
          <span className='text-gray-500 dark:text-gray-400'>·</span>
          <time
            dateTime={new Date(item.createdAt).toISOString()}
            className='text-gray-500 dark:text-gray-400 hover:underline'
          >
            {timeAgo}
          </time>
        </div>

        {/* Body: Ranking Info */}
        <div className='mt-1'>
          <p className='text-gray-600 dark:text-gray-400 mb-2 flex items-center'>
            {" "}
            {/* ★ flex と items-center を追加 */}
            {/* ★ StarIcon にサイズ指定 */}
            <StarIcon
              className='h-4 w-4 inline mr-1 text-yellow-500'
              fill='currentColor'
            />{" "}
            {/* fill を追加して塗りつぶし */}「
            <span className='font-semibold'>{rankingList.subject}</span>
            」ランキングを
            {rankingList.createdAt.getTime() === item.createdAt.getTime()
              ? "公開"
              : "更新"}
            しました
          </p>

          <Link
            href={`/rankings/${rankingList.id}`}
            className='block border rounded-lg p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 dark:border-gray-700'
          >
            <h3 className='font-semibold text-base mb-1 text-gray-800 dark:text-gray-200'>
              {rankingList.subject}
            </h3>
            {rankingList.description && (
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                {rankingList.description}
              </p>
            )}
            <ul className='space-y-1'>
              {rankingList.items?.map((rankedItem) => (
                <li key={rankedItem.id} className='flex items-center text-sm'>
                  <span className='font-semibold mr-2 w-4 text-right'>
                    {rankedItem.rank}.
                  </span>
                  {rankedItem.imageUrl && (
                    <Image
                      src={rankedItem.imageUrl}
                      alt={rankedItem.itemName}
                      width={20}
                      height={20}
                      className='rounded-sm object-cover mr-2'
                    />
                  )}
                  <span className='text-gray-700 dark:text-gray-300'>
                    {rankedItem.itemName}
                  </span>
                </li>
              ))}
              {rankingList.items &&
                rankingList.items.length > 0 &&
                rankingList.items.length >= 3 && (
                  <li className='text-xs text-gray-500 dark:text-gray-400 pt-1'>
                    ... もっと見る
                  </li>
                )}
            </ul>
          </Link>
        </div>

        {/* Footer: Action Buttons (自作アイコンを使用) */}
        <div className='flex justify-between pt-2 text-gray-500 dark:text-gray-400'>
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-blue-500'
          >
            {/* ★ MessageCircleIcon にサイズ指定 */}
            <MessageCircleIcon className='h-[18px] w-[18px]' />
            <span>0</span>
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-green-500'
          >
            {/* ★ RepeatIcon にサイズ指定 */}
            <RepeatIcon className='h-[18px] w-[18px]' />
            <span>0</span>
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-red-500'
          >
            {/* ★ HeartIcon にサイズ指定 */}
            <HeartIcon className='h-[18px] w-[18px]' />
            <span>0</span>
          </Button>
          <Button variant='ghost' size='icon' className='hover:text-blue-500'>
            {/* ★ ShareIcon にサイズ指定 */}
            <ShareIcon className='h-[18px] w-[18px]' />
          </Button>
        </div>
      </div>
    </div>
  );
}
