import PostForm from "../posts/PostForm";
import TimelineFeed from "../feeds/TimelineFeed";
import type { FeedItemWithRelations } from '@/lib/data/feedQueries';

interface MainContentForHomeProps {
  initialFeedItems: FeedItemWithRelations[];
  initialNextCursor: string | null;
}

export default function MainContentForHome({
  initialFeedItems,
  initialNextCursor,
}: MainContentForHomeProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col h-full">
      <div className="mb-3 flex-shrink-0">
        <PostForm /> {/* PostForm をここに配置 */}
      </div>
      <div className="flex-1 overflow-y-auto">
        <TimelineFeed
          initialItems={initialFeedItems}
          initialNextCursor={initialNextCursor}
        />
      </div>
    </div>
  );
}