// app/page.tsx
import MainContentForHome from "@/components/component/layouts/MainContentForHome";
import { getCurrentLoginUserData } from "@/lib/data/userQueries";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { generateImageUrl } from "@/lib/utils/storage";
import type { UserSnippet } from "@/lib/types";

export default async function Home() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  // ログインユーザーのDB情報
  const rawUserData = await getCurrentLoginUserData(clerkId);
  if (!rawUserData?.id || !rawUserData?.username) {
    console.error("ログインユーザーのDB情報が見つかりません。");
    notFound();
  }

  // 署名付きURLに変換
  const image = await generateImageUrl(rawUserData.image);
  const coverImageUrl = await generateImageUrl(rawUserData.coverImageUrl);
  const currentLoginUserData: UserSnippet & { coverImageUrl: string | null } = {
    ...rawUserData,
    image,
    coverImageUrl,
  };

  return (
    <MainContentForHome currentLoginUserData={currentLoginUserData} />
  );
}