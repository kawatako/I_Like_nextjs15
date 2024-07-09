import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import CommentList from "./CommentList";
import { ClockIcon, HeartIcon, MessageCircleIcon, Share2Icon } from "./Icons";

export default function Post({ post }: any) {
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
          <Button variant="ghost" size="icon">
            <HeartIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircleIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2Icon className="h-5 w-5 text-muted-foreground" />
          </Button>
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
