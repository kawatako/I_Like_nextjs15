import { RankingListEditView } from "@/components/component/rankings/RankingListEditView";
import { getRankingListForEdit } from "@/lib/data/rankingQueries"; // データ取得関数をインポート
import { notFound } from "next/navigation";
// ★ ↓表示・編集用UIコンポーネント (これは次に作成します)
// import { RankingListEditView } from "@/components/component/rankings/RankingListEditView";

// ページコンポーネントは通常 async 関数になります
export default async function RankingEditPage({ params }: { params: { listId: string } }) {
  // 1. URLパラメータから listId を取得
  const listId = params.listId;
  console.log(`Rendering edit page for listId: ${listId}`); // ログ

  // 2. データ取得関数を呼び出す
  // この関数内で認証・権限チェックも行われる
  const rankingList = await getRankingListForEdit(listId);

  // 3. データが取得できなかった場合 (null が返ってきた場合) は notFound() を呼ぶ
  if (!rankingList) {
    console.log(`Ranking list ${listId} not found or user not authorized.`);
    notFound(); // 404ページを表示
  }

  // 4. データが取得できたら、表示・編集用コンポーネントをレンダリング
  //    取得したデータを props として渡す
  console.log(`Rendering edit view for list: ${rankingList.subject}`);
  return (
    <div className="container mx-auto p-4">
      {/* --- JSON 表示の代わりに RankingListEditView を呼び出す --- */}
      <RankingListEditView rankingList={rankingList} />
      {/* ---------------------------------------------------------- */}
    </div>
  );
}