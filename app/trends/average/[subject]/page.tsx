// app/trends/average/[subject]/page.tsx
//サーバー上で URL から「何のテーマ」のリクエストかをデコードして取得し、見出しと、テーマ名を渡した子コンポーネントを描画し、子コンポーネント側で初めてクライアント（ブラウザ）でデータを取りにいって表示
import AverageItemRankList from "@/components/component/trends/AverageItemRankList";

interface PageProps {
  params: Promise<{ subject: string }>;
}

export default async function SubjectAveragePage({ params }: PageProps) {
  const { subject: rawSubject } = await params;

  // URL エンコードされているかもしれないのでデコード
  const subject = Array.isArray(rawSubject)
    ? decodeURIComponent(rawSubject[0]) // 配列なら最初の要素を取り出す
    : decodeURIComponent(rawSubject); // 文字列ならそのまま使う

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">「{subject}」の平均順位</h1>
      <AverageItemRankList subject={subject} />
    </div>
  );
}
