// app/rankings/create/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { NewRankingForm } from "@/components/component/rankings/NewRankingForm"; // ★ 新しいフォームをインポート ★
// import { RankingListForm } from "@/components/component/rankings/RankingListForm"; // ← 古いフォームは削除

export default async function CreateRankingPage() {
  // ★ 認証チェックを追加 ★
  // このページはログインが必須のはずなので、認証を行う
  const { userId } =  await auth();
  if (!userId) {
    // ログインしていなければサインインページにリダイレクト
    redirect('/sign-in');
  }

  return (
    // レイアウトは既存のものを維持しつつ、中身を NewRankingForm に置き換え
    <div className="container mx-auto p-4 max-w-2xl"> {/* 最大幅を少し広げる (任意) */}
      <h1 className="text-2xl font-bold mb-6">新しいランキングを作成</h1> {/* mb を調整 */}
      <NewRankingForm />
    </div>
  );
}