import { auth } from "@clerk/nextjs/server";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CommentList from "./CommentList";
import { ClockIcon } from "./Icons";
import PostInteraction from "./PostInteraction";

export default function Post({ post }: any) {
  // const { userId } = auth();

  // const initialLikes = post.likes;
  // const initialIsLiked = post.likes.some((like: any) => like.userId === userId);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-bold">{post.author.username}</h3>
          <p className="text-muted-foreground">{post.author.username}</p>
        </div>
      </div>
      <div className="space-y-2">
        <p>{post.content}</p>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <PostInteraction
            postId={post.id}
            // likes={post.likes.map((like: any) => like.userId)}
            initialLikes={post.likes.map((like:any) => like.userId)}
            // initialIsLiked={initialIsLiked}
      
            commentNumber={post._count.replies}
          />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ClockIcon className="h-5 w-5" />
          <span>{post.timestamp}</span>
        </div>
      </div>
      {post.comments && <CommentList replies={post.replies} />}
    </div>
  );
}
