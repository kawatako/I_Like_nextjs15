// components/Comment.tsx
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { HeartIcon } from "./Icons";

export default function Comment({ reply }: any) {
  return (
    <div className="flex items-center gap-4">
      <Avatar className="w-8 h-8">
        <AvatarImage src="/placeholder-user.jpg" />
        <AvatarFallback>AC</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium">{reply.author}</p>
        <p className="text-muted-foreground">{reply.content}</p>
      </div>
      <Button variant="ghost" size="icon">
        <HeartIcon className="h-5 w-5 text-muted-foreground" />
      </Button>
    </div>
  );
}
