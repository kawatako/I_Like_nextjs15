"use client";

// components/PostForm.tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { addPostAction } from "@/lib/actions";
import { useCallback, useRef, useState } from "react";
import { SubmitButton } from "./SubmitButton";

export default function PostForm() {
  const [error, setError] = useState<string | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = useCallback(async (formData: FormData) => {
    const result = await addPostAction(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setError(undefined);
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  }, []);

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <form
          ref={formRef}
          action={handleSubmit}
          className="flex items-center flex-1"
        >
          <Input
            type="text"
            placeholder="What's on your mind?"
            className="flex-1 rounded-full bg-muted px-4 py-2"
            name="post"
          />
          {/* <Button variant="ghost" size="icon">
            <SendIcon className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Tweet</span>
          </Button> */}
          <SubmitButton />
        </form>
      </div>
      {error && (
        <p className="text-red-500 mt-1 flex items-center ml-14">{error}</p>
      )}
    </div>
  );
}
