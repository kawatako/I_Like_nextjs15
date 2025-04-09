import LeftSidebar from "@/components/component/layouts/LeftSidebar";
import MainContent from "@/components/component/layouts/MainContent";
import RightSidebar from "@/components/component/layouts/RightSidebar";
import { getCurrentLoginUserData } from "@/lib/data/userQueries"; // ユーザーデータ取得関数をインポート
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const currentLoginUserData = await getCurrentLoginUserData(userId);

  if (!currentLoginUserData) {
    notFound();
  }

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[240px_1fr_240px] gap-6 p-6 overflow-hidden">
      <LeftSidebar currentLoginUserData={currentLoginUserData} />
      <MainContent currentLoginUserData={currentLoginUserData} />
    </div>
  );
}
