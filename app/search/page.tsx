// app/search/page.tsx
import Link from "next/link";
import { Sentiment } from "@prisma/client"; // Sentiment Enum をインポート
import { searchRankings, type SearchedRankingItem } from "@/lib/data/trendQueries"; // 検索関数と型をインポート
import { Suspense } from 'react'; // Suspense をインポート

// ローディング中に表示するコンポーネント (任意でデザイン調整)
function LoadingSpinner() {
  return (
      <div className="flex justify-center items-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" role="status">
              <span className="sr-only">検索中...</span>
          </div>
      </div>
  );
}

// 検索結果を非同期で取得・表示するコンポーネント
async function SearchResults({ query }: { query: string }) {
  // ★ searchRankings 関数を呼び出して結果を取得 ★
  const results: SearchedRankingItem[] = await searchRankings(query);

  return (
    <div>
      {/* 検索キーワードを表示 */}
      <h1 className="text-2xl font-bold mb-6">
        検索結果: "<span className="text-primary">{query}</span>"
      </h1>

      {/* 結果表示エリア */}
      <div className="border rounded-lg p-4">
        {results.length === 0 ? (
          // 結果がない場合のメッセージ
          <p className="text-muted-foreground text-center py-4">
            「{query}」に一致するランキングは見つかりませんでした。
          </p>
        ) : (
          // 結果がある場合のリスト表示
          <ul className="space-y-1">
            {results.map((ranking) => {
              const prefix = ranking.sentiment === Sentiment.LIKE ? "好きな " : "嫌いな ";
              const displayTitle = prefix + ranking.subject;
              return (
                <li key={ranking.id}>
                  <Link
                    href={`/rankings/${ranking.id}`} // 個別ランキングページへリンク
                    className="block p-2 rounded hover:bg-muted transition-colors text-sm"
                    title={`作成日: ${ranking.createdAt.toLocaleDateString()}`} // title属性に作成日などを表示
                  >
                    {displayTitle}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// 検索ページのメインコンポーネント (Server Component)
export default async function SearchPage({
  searchParams
}: {
  searchParams?: {
    q?: string; // URLクエリパラメータ 'q' を受け取る
  }
}) {
  // searchParams を await で解決 (Next.js 15+)
  const resolvedSearchParams = searchParams ? await searchParams : {};
  // クエリ 'q' を取得し、前後の空白を削除
  const query = resolvedSearchParams.q?.trim() ?? "";

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* query が存在する場合のみ結果表示コンポーネントを呼び出す */}
      {query ? (
        // Suspense で囲み、データ取得中にローディング表示を出す
        <Suspense fallback={<LoadingSpinner />}>
          {/*
             @ts-expect-error Async Server Component を Suspense の子として使う場合の
             よくある型エラー回避コメント。通常は問題なく動作します。
          */}
          <SearchResults query={query} />
        </Suspense>
      ) : (
        // query がない場合は案内メッセージを表示
        <div className="text-center p-8 text-muted-foreground">
          ヘッダーの検索窓からキーワードを入力して検索してください。
        </div>
      )}
    </div>
  );
}