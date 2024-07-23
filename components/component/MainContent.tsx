import PostForm from "./PostForm";
import PostList from "./PostList";

//https://github.com/safak/next-social/blob/completed/src

interface UserData {
  id: string;
  username: string | null;
  image: string | null;
}

interface LeftSidebarProps {
  currentLoginUserData: UserData | null;
}

export default function MainContent({
  currentLoginUserData,
}: LeftSidebarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col h-full overflow-hidden">
      <div className="mb-3">
        <PostForm currentLoginUserData={currentLoginUserData} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <PostList />
      </div>
    </div>
  );
}
