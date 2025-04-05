import { RankingListForm } from "@/components/component/rankings/RankingListForm"; // 作成したフォームをインポート

export default function CreateRankingPage() {
  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">新しいランキングリストを作成</h1>
      <RankingListForm />
    </div>
  );
}