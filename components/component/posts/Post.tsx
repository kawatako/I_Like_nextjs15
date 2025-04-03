import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CommentList from "../comments/CommentList";
import { ClockIcon } from "@/components/component/Icons";
import PostInteraction from "../likes/PostInteraction";
import Link from "next/link";

export default function Post({ post }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/profile/${post.author.username}`}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author.image} />
            <AvatarFallback>AC</AvatarFallback>
          </Avatar>
        </Link>
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
            initialLikes={post.likes.map((like: any) => like.userId)}
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
