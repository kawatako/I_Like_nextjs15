【実装設計レポート】ランキング SNS アプリケーション 「TopMe」

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
app/
├── api/
│   ├── healthcheck/route.ts        — サービスの死活監視用エンドポイント  
│   ├── keep-alive/route.ts         — アプリケーションをアイドル状態から維持するための定期 ping  
│   ├── uploadImage/route.ts        — 画像アップロード処理（Supabase Storage 連携）  
│   └── webhooks/clerk/route.ts     — Clerk の Webhook（ユーザー作成・更新同期）  
├── feeds/[feedItemId]/page.tsx     — フィードアイテム詳細ページ  
├── follows/[username]/page.tsx     — フォロー／フォロワー一覧ページ  
├── layout.tsx                      — 全体のレイアウト（ヘッダー・フッター・ナビなど）  
├── notification/                   — 通知関連ページ（未実装 or 計画中）  
├── page.tsx                        — ホームタイムラインページ  
├── profile/[username]/
│   ├── edit/page.tsx               — プロフィール編集ページ（RSC）  
│   ├── page.tsx                    — プロフィール表示ページ（RSC）  
│   └── tabs/
│       ├── ProfileTabsClient.tsx   — プロフィールのタブ切り替えクライアントコンポーネント  
│       ├── RankingTab.tsx          — 自作ランキング一覧タブ  
│       ├── DraftsTab.tsx           — 下書きランキング一覧タブ  
│       ├── FeedTab.tsx             — 投稿・RT タイムラインタブ  
│       ├── LikesTab.tsx            — いいね済みアイテム一覧タブ  
│       └── RankingLikesTab.tsx     — ランキングいいね一覧タブ  
├── rankings/
│   ├── create/page.tsx             — 新規ランキング作成ページ  
│   └── [listId]/
│       ├── edit/page.tsx           — ランキング編集ページ  
│       └── page.tsx                — ランキング詳細表示ページ  
├── search/page.tsx                 — 検索結果表示ページ（タグ・タイトル・ユーザー）  
├── sign-in/[[...sign-in]]/page.tsx — Clerk サインイン UI  
├── sign-up/[[...sign-up]]/page.tsx — Clerk サインアップ UI  
└── trends/
    ├── page.tsx                    — トレンドトップページ  
    └── average/[subject]/page.tsx  — 特定テーマ(subject)の週・月平均スコア推移ページ  

components/
├── component/
│   ├── common/
│   │   ├── ClientOnly.tsx          — クライアントサイドのみで描画するラッパー  
│   │   ├── ImageUploader.tsx       — 画像アップロード UI＋ロジック  
│   │   └── SubmitButton.tsx        — ボタン＋読み込みインジケータ  
│   ├── feeds/
│   │   ├── cards/
│   │   │   ├── PostCard.tsx        — 投稿フィードカード  
│   │   │   ├── RankingUpdateCard.tsx — ランキング更新フィードカード  
│   │   │   ├── RetweetCard.tsx     — リツイートカード  
│   │   │   └── QuoteRetweetCard.tsx — 引用リツイートカード  
│   │   └── TimelineFeed.tsx        — ホーム／プロフィール用タイムライン  
│   ├── follows/                    — フォロー関連ボタン・一覧コンポーネント  
│   ├── likes/FeedLike.tsx          — いいねボタン＋カウント表示  
│   ├── modals/                     — RT/引用RT 用モーダルダイアログ  
│   ├── posts/                      — 投稿フォーム・投稿リスト・詳細  
│   ├── profiles/                   — プロフィールヘッダー・編集フォーム・各タブリスト  
│   ├── rankings/                   — ランキング作成／編集／詳細表示用コンポーネント  
│   ├── search/                     — 検索フォーム・ソートタブ・結果リスト  
│   └── trends/                     — トレンド件数リスト・テーマ別推移表示など  
└── ui/                             — shadcn/ui ベースの共通 UI コンポーネント  

lib/
├── actions/                        — Server Actions（DB 書き込みや外部 API 呼び出し）  
├── data/                           — DB 読み込み専用クエリ群  
├── client.ts                       — PrismaClient／SupabaseClient の初期化  
├── prisma/payloads.ts              — Prisma の select・include 定義共通化  
├── supabaseClient.ts               — Supabase JavaScript クライアント初期化  
├── types.ts                        — アプリ内共通型定義  
└── utils/
    ├── cn.ts                       — className 結合ヘルパー  
    └── storage.ts                  — Supabase Storage 周りユーティリティ  

prisma/
├── schema.prisma                   — DB モデル定義  
└── migrations/                     — マイグレーション SQL  

supabase/functions/
├── _shared/supabaseClient.ts       — Edge Function 用 SupabaseClient 初期化  
└── calculate-trends/index.ts      — トレンド集計処理の Edge Function  

その他設定ファイル：
- next.config.mjs / tsconfig.json / tailwind.config.ts / middleware.ts など


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

6. 今後の開発計画・優先順位
通知機能の実装。
ランキング作成時の入力補助機能の実装。
関連のランキング

7. 課題・検討事項
トレンド機能「注目アイテム」のアイテム名表記ゆれへの対応策検討。(未定)
トレンド集計バッチ処理のパフォーマンスチューニング（特にデータ量増加時）。
通知、コメント、シェア機能、サジェスト機能の詳細仕様策定。
キャッシュ戦略などデータ処理
利用規約

