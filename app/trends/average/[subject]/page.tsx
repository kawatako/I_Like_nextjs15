// app/trends/average/[subject]/page.tsx
import AverageItemRankClient from "@/components/component/trends/AverageItemRankClient";

interface PageProps {
  params: { subject: string };
}

export default function SubjectAveragePage({ params }: PageProps) {
  const raw = Array.isArray(params.subject)
    ? params.subject[0]
    : params.subject;
  const subject = decodeURIComponent(raw);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">「{subject}」の平均順位</h1>
      <AverageItemRankClient subject={subject} />
    </div>
  );
}
