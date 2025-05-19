"use client";

import { Button } from "@/components/ui/button";
import { SendIcon } from "@/components/Icons";
import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        type='submit'
        variant='ghost'
        size='icon'
        disabled={pending}
        className={`${pending && "cursor-not-allowed"}`}
      >
        <SendIcon className='h-5 w-5 text-muted-foreground' />
        <span className='sr-only'>Post</span>
      </Button>
    </>
  );
}
