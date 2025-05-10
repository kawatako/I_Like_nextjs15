【実装設計レポート】ランキング SNS アプリケーション

1. プロジェクト概要
目的: ユーザーが自由にテーマを設定し、アイテムをランク付けして共有できる、SNS 機能（フォロー、いいね、リツイート等）を備えた Web アプリケーションを開発する。
テーマ: 自分で作るランキング × SNS
主要機能: ユーザー認証、プロフィール管理、ランキング作成・編集・表示、アイテム登録・並び替え、タグ付け、画像添付（リストヘッダー、アイテム、投稿）、タイムラインフィード、フォロー/フォロワー、いいね、リツイート、引用リツイート、トレンド表示、検索、通知、コメント。

2. 技術スタック
フレームワーク: Next.js 15.3.0 (App Router)
言語: TypeScript ^5
UI ライブラリ: React 19.1.0, React DOM 19.1.0
認証・ユーザー管理: Clerk (@clerk/nextjs: ^5.7.5)
データベース: Supabase PostgreSQL
ORM: Prisma (^6.6.0, @prisma/client: ^5.16.1)
DB 接続 (Edge Functions): Prisma Accelerate (@prisma/extension-accelerate: ^1.3.0)
スタイリング: Tailwind CSS ^3.4.1, PostCSS ^8, tailwindcss-animate ^1.0.7
UI コンポーネント: shadcn/ui (Radix UI ^1.1.0 ベース), Lucide React ^0.399.0, class-variance-authority ^0.7.0, clsx ^2.1.1, tailwind-merge ^2.3.0
データ取得 (クライアント): SWR ^2.3.3
ドラッグ＆ドロップ: dnd-kit (@dnd-kit/core: ^6.3.1, @dnd-kit/sortable: ^10.0.0)
Webhook 検証: Svix ^1.63.0
バリデーション: Zod ^3.23.8
画像ストレージ: Supabase Storage
開発ツール: ESLint ^8, TypeScript Types (@types/*), ts-node ^10.9.2 (seed用)
Node.js: 20.15.1

3. ファイル構成 (主要ディレクトリ)
.
├── app/                      # Next.js App Router (ルーティング、ページ、レイアウト)
│   ├── (home)/             # ホーム画面関連 (レイアウト、ページ)
│   ├── api/                  # API Routes (例: Webhook)
│   ├── profile/              # プロフィール関連ページ
│   │   └── [username]/
│   │       ├── edit/page.tsx # プロフィール編集ページ (RSC)
│   │       ├── follows/      # フォロー/フォロワー/リクエストページ (完成済み)
│   │       ├── page.tsx      # プロフィール表示ページ (RSC)
│   │       └── tabs/         # プロフィールタブ関連コンポーネント
│   │           ├── ProfileTabsClient.tsx (Client)
│   │           ├── RankingTab.tsx (RSC)
│   │           ├── DraftsTab.tsx (RSC)
│   │           ├── FeedTab.tsx (RSC)
│   │           ├── LikesTab.tsx (RSC)
│   │           └── RankingLikesTab.tsx (RSC)
│   ├── rankings/             # ランキング関連ページ
│   │   ├── create/page.tsx # ランキング新規作成ページ (RSC)
│   │   └── [listId]/         # ランキング詳細・編集ページ
│   │       ├── edit/page.tsx # ランキング編集ページ (RSC)
│   │       └── page.tsx      # ランキング詳細ページ (RSC)
│   ├── feeds/                # フィード詳細ページ
│   │   └── [feedItemId]/page.tsx
│   ├── settings/             # 設定ページ (Clerk コンポーネント使用想定)
│   ├── sign-in/              # サインインページ (Clerk)
│   └── sign-up/              # サインアップページ (Clerk)
├── components/               # 再利用可能な UI コンポーネント
│   ├── component/            # アプリケーション固有コンポーネント
│   │   ├── common/           # アプリ全体で使う共通部品 (ImageUploader, TagInput)
│   │   ├── feeds/            # フィード関連 (TimelineFeed, 各種Card)
│   │   ├── follows/          # フォロー関連 (FollowButton)
│   │   ├── likes/            # いいね関連 (FeedLike)
│   │   ├── modals/           # モーダル (RetweetQuoteDialog, QuoteCommentModal)
│   │   ├── posts/            # 投稿関連 (PostForm, PostDetail)
│   │   ├── profiles/         # プロフィール関連 (ProfileHeader, ProfileTabsClient, 各リストClient)
│   │   ├── rankings/         # ランキング関連 (NewRankingForm, RankingEditView, RankingDetailView, EditableRankedItem, LikedRankingListItem)
│   │   └── Icons.tsx         # アイコン集約
│   └── ui/                   # shadcn/ui コンポーネント
├── lib/                      # 共通ロジック、ユーティリティ、サービス
│   ├── actions/              # Server Actions (DB変更、外部連携など)
│   ├── data/                 # データ取得関数 (DB読み取り、整形)
│   ├── hooks/                # カスタムフック (useInfiniteScroll, useCardInteraction, useImageUploader)
│   ├── prisma/               # Prisma 関連
│   │   └── payloads.ts       # 共通 Select/Payload 定義 ★New★
│   ├── types.ts              # 共有 TypeScript 型定義
│   └── client.ts             # Prisma Client インスタンス
│   └── supabaseClient.ts     # Supabase Client インスタンス (画像アップロード用)
│   └── utils.ts              # 共通ヘルパー関数 (例: cn)
├── prisma/                   # Prisma スキーマ、マイグレーション
│   ├── migrations/
│   └── schema.prisma
├── public/                   # 静的ファイル
├── supabase/                 # Supabase Functions プロジェクト (トレンド集計用) ★New★
│   └── functions/
│       ├── _shared/
│       │   └── prisma.ts     # Edge Function用 Prisma Client 初期化 ★New★
│       └── calculate-trends/ # トレンド集計関数 ★New★
│           └── index.ts
└── ... (設定ファイル: next.config.js, tailwind.config.ts, tsconfig.json, .env.local etc.)

4. データベース設計 (主要モデル)
User: Clerk 認証と連携。プロフィール情報 (bio, location, birthday, image, coverImageUrl, socialLinks - JSON型), フォロー/フォロワー関係、いいね、投稿、ランキング、フィードアイテム等へのリレーションを持つ。
Post: テキスト投稿 (content)、画像 URL (imageUrl) を持つ。いいね (Like)、リプライ (Reply)、フィードアイテム (FeedItem) と関連。
RankingList: ランキングのメタ情報 (subject, description, listImageUrl, status, displayOrder)、作者 (authorId)、アイテム (RankedItem - 1対多)、タグ (Tag - 多対多)、いいね (Like)、フィードアイテム (FeedItem) と関連。
RankedItem: ランキング内のアイテム (itemName, rank, itemDescription, imageUrl)。
Tag: タグ (name - ユニーク)。RankingList と多対多リレーション。TrendingTag と 1 対多リレーション。
FeedItem: タイムライン上のアクティビティを表す中心モデル。type (Enum) で種類を区別。userId, createdAt を持ち、Post, RankingList, retweetOfFeedItem, quotedFeedItem などへのリレーションを持つ。retweetCount, quoteRetweetCount も持つ。
Like: いいねを表す。userId, postId?, rankingListId? を持つ。複合ユニーク制約は未設定（アクション側で重複防止）。
Follow / FollowRequest: フォロー関係、リクエスト状態を管理。
TrendPeriod (Enum): トレンド集計期間 (WEEKLY, MONTHLY)。
TrendingSubject / TrendingTag / TrendingItem: 各トレンドの集計結果を保存するモデル (subject/tagName/itemName, count/rankScore, period, calculationDate)。

5. 主要機能の実装方針と現状
5.1. 認証・ユーザー管理: Clerk を利用。Webhook (api/webhooks/clerk) により DB とユーザー情報を同期。（実装済み）
5.2. 投稿機能: テキストと画像1枚の投稿に対応。PostForm (Client) + createPostAction (Server Action) + useImageUploader で実装。（実装済み・動作確認済み）
5.3. ランキング機能:
作成/編集: NewRankingForm (新規) と RankingEditView (編集) コンポーネントを使用（将来的な統合を検討）ヘッダー画像、アイテム画像の添付に対応（UI 実装済み）。タグ入力 UI をこれから実装。アイテムの DnD 並び替えは実装済み。Server Action (createCompleteRankingAction, saveRankingListItemsAction) は画像 URL 保存に対応済みだが、タグ処理は未実装。
表示 (詳細): RankingDetailView.tsx で表示。ヘッダー画像、アイテム画像表示に対応済み。タグ表示は未実装。
表示 (プロフィール一覧): ProfileRankingListsClient.tsx と SortableListItem.tsx を使用。SWR による無限スクロール、DnD による並び替えに対応済み。「TOP N」表示形式に修正済み。
5.4. タイムライン機能:
FeedItem モデル中心。フォロー中のユーザー (+自分自身) のアクティビティを時系列表示。
データ取得は汎用 Server Action getPaginatedFeedAction と useInfiniteScroll フックを使用。（リファクタリング済み）
表示はクライアントコンポーネント TimelineFeed (ホーム用) と ProfileTimelineFeed (プロフィール用) で行う。type に応じて各種カードコンポーネント (PostCard, RankingUpdateCard, RetweetCard, QuoteRetweetCard) を呼び出す。（実装済み）
自分のリツイート非表示は TimelineFeed 内で検討（現在は非表示にしていない）。
5.5. インタラクション機能:
いいね: Post, RankingList が対象。クライアントコンポーネント <FeedLike> (useOptimistic 使用) と Server Actions (like/unlikePost/RankingListAction) で実装済み。各種カード、リストアイテムに組み込み済み。
リツイート: retweetAction, undoRetweetAction (Server Action) と RetweetCard (表示) で実装済み。mutate によるキャッシュ更新も実装済み。
引用リツイート: コメント＋画像1枚の添付に対応。quoteRetweetAction, deleteQuoteRetweetAction (Server Action)、QuoteRetweetCard (表示)、QuoteCommentModal (入力 UI) で実装済み。画像アップロード連携も完了。
5.6. フォロー機能:
フォロー/アンフォロー/リクエスト/承認/拒否/キャンセルアクション (followActions.ts) 実装済み。
ユーザーの公開/非公開設定 (isPrivate) に対応（スキーマにはあるが設定 UI は未実装）。
フォロー状態取得 (getFollowStatus) と表示ボタン (FollowButton) 実装済み。
フォロー/フォロワー数表示 (ProfileHeader) 実装済み。
フォロー/フォロワー/リクエスト一覧ページ (app/follows/[username]) 実装済み。
5.7. プロフィール機能:
表示: 新しいタブ構成 (page.tsx, ProfileTabsClient, 各 *Tab.tsx) を実装中。ヘッダー (ProfileHeader) は拡張済み（カバー画像、場所、誕生日、リンク表示）。
タブ内容: RankingTab, DraftsTab (共通 ProfileRankingListsClient 使用), FeedTab (ProfileTimelineFeed 使用), RankingLikesTab (LikedRankingListClient 使用), LikesTab (LikedFeedList 使用) を実装中/完了。
編集: 編集ページ (edit/page.tsx - RSC) と編集フォーム (ProfileEditForm.tsx - Client) を作成中。Server Action (updateProfileAction) は実装済み。フォームからのアクション呼び出しと UI 実装が次のステップ。
5.8. トレンド機能:
仕様: 人気タイトル数(月/週)、新着リスト、トレンドタグ数(月/週)、注目アイテムスコア(月/週)。各ランキングの集計結果(累計)
方針: バッチ集計 (Supabase Functions/Cron Jobs) + 専用テーブル (TrendingSubject, TrendingTag, TrendingItem, TrendPeriod Enum)。
状況: DB スキーマ定義完了、マイグレーション済み。集計用 Edge Function と表示 UI は未実装。
5.9. 検索機能 (計画): タイトル、アイテム名、タグでの部分一致検索、新着順表示。
5.10. 通知機能 (計画): フォロー系、いいね、RT、引用RT、コメントを対象。
5.11. コメント機能 (計画): Post および RankingList への単純リプライ形式。

6. 主要な共通コンポーネントとカスタムフック
UI コンポーネント: CardHeader, ImageUploader, TagInput (これから作成), EditableRankedItem, SortableListItem, LikedRankingListItem, FeedLike, FollowButton, 各種カード (PostCard 等), モーダル (RetweetQuoteDialog 等)
カスタムフック: useInfiniteScroll, useCardInteraction, useImageUploader

7. 今後の開発計画・優先順位
ランキング機能の完成:
タグ入力 UI (TagInput) の作成とフォーム (NewRankingForm, RankingEditView) への組み込み。
アイテム画像 UI (EditableRankedItem) の実装とフォームへの組み込み。
Server Actions (createCompleteRankingAction, saveRankingListItemsAction) へのタグ処理ロジック実装と画像 URL 連携の最終確認。
詳細表示 (RankingDetailView)、一覧表示 (ProfileRankingLists) へのタグ・画像表示追加。
プロフィール編集機能の完成:
ProfileEditForm コンポーネントの完成（handleSubmit ロジック）。
updateProfileAction との連携・動作確認。
プロフィールタブ表示の完成:
LikesTab のクライアントコンポーネント (LikedFeedList) とデータ取得アクション (getLikedFeedItemsAction) の実装完了と動作確認。
各タブコンポーネントの表示調整、無限スクロール等の最終確認。
トレンド機能バックエンド実装: 集計用 Supabase Edge Function (calculate-trends) の実装・デプロイ、Cron Job 設定。
トレンド機能 UI 実装: トレンドページ作成、期間選択 UI、各トレンド表示コンポーネント作成、データ取得関数呼び出し。
ランキング検索機能の実装。
通知機能の実装。
コメント機能の実装。
ランキング作成時のサジェスト機能の実装。
他SNSへのシェアボタン
関連のランキング

7.1 今後の開発計画・優先順位から完了ずみ
タグ入力 UI (TagInput) の作成とフォーム (NewRankingForm, RankingEditView) への組み込み。
アイテム画像 UI (EditableRankedItem) の実装とフォームへの組み込み。
Server Actions (createCompleteRankingAction, saveRankingListItemsAction) へのタグ処理ロジック実装と画像 URL 連携の最終確認。
詳細表示 (RankingDetailView)、一覧表示 (ProfileRankingLists) へのタグ・画像表示追加。
プロフィール編集機能の完成:
ProfileEditForm コンポーネントの完成（handleSubmit ロジック）。
updateProfileAction との連携・動作確認。
プロフィールタブ表示の完成:
LikesTab のクライアントコンポーネント (LikedFeedList) とデータ取得アクション (getLikedFeedItemsAction) の実装完了と動作確認。
各タブコンポーネントの表示調整、無限スクロール等の最終確認。
トレンド機能バックエンド実装: 集計用 Supabase Edge Function (calculate-trends) の実装・デプロイ、Cron Job 設定。
トレンド機能 UI 実装: トレンドページ作成、期間選択 UI、各トレンド表示コンポーネント作成、データ取得関数呼び出し。

8. 課題・検討事項
トレンド機能「注目アイテム」のアイテム名表記ゆれへの対応策検討。(未定)
トレンド集計バッチ処理のパフォーマンスチューニング（特にデータ量増加時）。
データベース Like テーブルへの複合ユニーク制約追加検討。
通知、コメント、シェア機能、サジェスト機能の詳細仕様策定。
全体的なエラーハンドリングとUI/UX の改善。
利用規約

# 検索機能
1. 機能概要
ユーザーはヘッダーの検索窓から自由にキーワードを入力し、下記の条件で公開済みランキングを検索・絞り込み・ソートした結果を確認できる。

専用ページ /search に遷移し、結果をタブ／サブタブで切り替え

初回SSR で 10 件を取得し描画し、以降は クライアント側無限スクロール で追加読み込み

2. 用語定義
用語	説明
ランキングリスト	ユーザーが作成した RankingList レコード（公開済みのみ対象）
スニペット（Snippet）	検索結果一覧で表示する最小限情報。RankingListSnippet 型で取得
タブ（Tab）	検索対象フィルター：「タイトル」「アイテム」「タグ」の３種類
サブタブ（Sort）	ソート条件：「件数順（月次）」「新着順」「いいね順」の３種類
nextCursor	無限スクロール用カーソル。直前取得の最後の RankingList.id

3. 機能要件
3.1 検索入力・ページ遷移
配置：グローバルヘッダー内のフォーム

挙動：Enter or ボタン押下で /search?q=<クエリ> に遷移

3.2 URL クエリパラメータ
q：検索キーワード

tab：title｜item｜tag（デフォルト：title）

sort：count｜new｜like（デフォルト：count）

cursor：無限スクロール中の次ページ取得用カーソル

例）/search?q=映画&tab=item&sort=new&cursor=abc123

3.3 検索対象フィルター（Tab）
タイトル（title）：RankingList.subject にキーワードが部分一致（case-insensitive）

アイテム（item）：配下 RankedItem.itemName に部分一致

タグ（tag）：Tag.name がキーワードと完全一致（case-insensitive）

3.4 ソート（Sub-Tab）
件数順（count）

TrendingSubject テーブル（period=MONTHLY）から月次集計件数を参照

件数データがないものは 0 とみなし降順

新着順（new）：RankingList.createdAt DESC

いいね順（like）：RankingList.likeCount DESC

3.5 ページネーション／無限スクロール
１回あたり取得数：limit = 10（クライアント側も同様）

実装：

Server Component（page.tsx）で searchRankingListsAction を実行し初回結果を initialData として渡す

Client Component（SearchPageClient.tsx）で useInfiniteScroll に fallbackData=initialData をセット

getKey(page, prev) で ["search", q, tab, sort, prev.nextCursor] を返却

searchRankingListsAction を fetcher として呼び出し、nextCursor がある限り追加入力

3.6 API／Server Action
関数名：searchRankingListsAction(query, tab, sort, cursor?, limit?)

返却型：Promise<PaginatedResponse<RankingListSnippet>>

編集する
type PaginatedResponse<T> = {
  items: T[];         // 取得データ（最大 limit 件）
  nextCursor: string | null; // 追加取得用カーソル
}
内部処理フロー：

where.status = PUBLISHED を固定

where フィルターを tab に応じて組み立て

orderBy を sort に応じて設定、ただし count のみ JS 側マージ＆ソート

Prisma の findMany({ where, orderBy, cursor, skip, take }) で取得

余剰分（take = limit + 1）を切り分けて nextCursor を算出

4. UI 要件
SearchTabs（タイトル／アイテム／タグ）

SearchSortTabs（件数順／新着順／いいね順）

SearchResultList

リストアイテム：RankingListSnippet の subject／アイテム上位３／サムネイル／いいね数／アイテム総数

下部に IntersectionObserver 用 div ref={loadMoreRef} を配置

ローディング表示、終端表示を用意

5. 非機能要件
レスポンス性能：初回SSRは 200ms 以下、以降フェッチは 100ms 以下を目指す

キャッシュ：SWR のキャッシュを有効にし、タブ切替時も再利用

SEO：初回 SSR 時点で検索結果を HTML に含める

セキュリティ：公開済みのみ検索対象。クライアントから不正クエリでもステータス固定

6. 受け入れ基準
q に “あ” を入れて /search?q=あ で 10 件が初回表示される

タブ／ソートを切り替えると URL の tab／sort が更新され結果も変更

下までスクロールすると次ページ 10 件が追加され、cursor が URL に反映

TrendingSubject の月次件数順が正しく反映

検索後ブラウザの戻る／進むで状態復元可能

├── app/
│   └── search/
│       └── page.tsx                   # Server Component（初回SSR＋Client呼び出し）
└── components/
    └── component/
        └── search/                ← クライアント用コンポーネントは全部ここ
            ├── SearchForm.tsx         # ヘッダー内の検索フォーム
            ├── SearchTabs.tsx         # 「タイトル／アイテム／タグ」タブ
            ├── SearchSortTabs.tsx     # 「件数順／新着順／いいね順」サブタブ
            ├── SearchResultList.tsx   # 検索結果リスト＋無限スクロールトリガー
            └── SearchPageClient.tsx   # 上記４つを束ねる Client Component（無限スクロール＋タブ切替）