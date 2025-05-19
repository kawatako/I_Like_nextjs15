// app/trends/average/[subject]/page.tsx
import AverageItemRankList from "@/components/trends/AverageItemRankList";

interface PageProps {
  params: Promise<{ subject: string }>;
}

export default async function SubjectAveragePage({ params }: PageProps) {
  const { subject: rawSubject } = await params;
  const subject = Array.isArray(rawSubject)
    ? decodeURIComponent(rawSubject[0])
    : decodeURIComponent(rawSubject);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        「{subject}」のランキング集計
      </h1>
      <h3 className="text-lg mb-4">※ランキングは毎日0時に更新されます</h3>
      <AverageItemRankList subject={subject} />
    </div>
  );
}
