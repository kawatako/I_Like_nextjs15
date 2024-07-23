import LeftSidebar from "@/components/component/LeftSidebar";
import MainContent from "@/components/component/MainContent";
import RightSidebar from "@/components/component/RightSidebar";
import { getCurrentLoginUserData } from "@/lib/user/userService";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

export default async function Home() {
  const { userId } = auth();
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
      <RightSidebar />
    </div>
  );
}
