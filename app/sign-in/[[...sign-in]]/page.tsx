// app/sign-in/[[...sign-in]]/page.tsx
"use client";
// @ts-ignore
const PK = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignInPage() {
  useEffect(() => {
    console.log("👀 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:", PK);
  }, []);
  return (
    <div className="h-[calc(100vh-96px)] flex items-center justify-center">
      <SignIn />
    </div>
  );
}
