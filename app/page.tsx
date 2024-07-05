import LeftSidebar from "@/components/component/LeftSidebar";
import MainContent from "@/components/component/MainContent";
import RightSidebar from "@/components/component/RightSidebar";

//https://github.com/safak/next-social/blob/completed/src/app/profile/%5Busername%5D/page.tsx

export default function Home() {
  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[240px_1fr_240px] gap-6 p-6 overflow-hidden">
      <LeftSidebar />
      <MainContent />
      <RightSidebar />
    </div>
  );
}
