// components/PostForm.tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendIcon } from "./Icons";
import prisma from "@/lib/client";
import { useAuth } from "@clerk/nextjs";
import { addPostAction } from "@/lib/actions";
// import { addPostAction } from "@/lib/actions";

export default function PostForm() {
  // async function addPostAction(formData: FormData) {
  //   "use server";

  //   const post = formData.get("post") as string;

  //   // プリズマを使用してデータベースに投稿を追加
  //   await prisma.post.create({
  //     data: {
  //       content: post,
  //       // 他の必要なフィールド（例：authorId）も追加します
  //     },
  //   });
  // }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="w-10 h-10">
        <AvatarImage src="/placeholder-user.jpg" />
        <AvatarFallback>AC</AvatarFallback>
      </Avatar>
      <form action={addPostAction} className="flex items-center flex-1">
        <Input
          type="text"
          placeholder="What's on your mind?"
          className="flex-1 rounded-full bg-muted px-4 py-2"
          name="post"
        />
        <Button variant="ghost" size="icon">
          <SendIcon className="h-5 w-5 text-muted-foreground" />
          <span className="sr-only">Tweet</span>
        </Button>
      </form>
    </div>
  );
}
