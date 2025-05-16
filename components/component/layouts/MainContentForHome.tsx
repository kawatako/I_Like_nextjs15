// components/component/layouts/MainContentForHome.tsx
import PostForm from "../posts/PostForm";
import TimelineFeed from "../feeds/TimelineFeed";
import type { UserSnippet } from "@/lib/types";

interface MainContentForHomeProps {
  currentLoginUserData: UserSnippet;
}

export default function MainContentForHome({
  currentLoginUserData,
}: MainContentForHomeProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col h-full">
      <div className="mb-3 flex-shrink-0">
        <PostForm currentLoginUserData={currentLoginUserData} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <TimelineFeed
          feedType="home"
          loggedInUserDbId={currentLoginUserData.id}
        />
      </div>
    </div>
  );
}
