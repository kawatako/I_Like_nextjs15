// lib/types.ts

/** ランキングのステータス */
export type ListStatus = "DRAFT" | "PUBLISHED";

/** フィードの種類 */
export type FeedType = "POST" | "RANKING_UPDATE" | "RETWEET" | "QUOTE_RETWEET";




export type TrendPeriod =
  "WEEKLY" | "MONTHLY";

/** 無限スクロール等で使う共通レスポンス */
export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

/** Server Action の汎用戻り値 */
export type ActionResult = {
  success: boolean;
  error?: string;
  [key: string]: any;
};

/** ユーザーの最小限スニペット */
export interface UserSnippet {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

/** 投稿＋メタ情報 */
export interface PostWithData {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: UserSnippet;
  _count: { replies: number };
  likes: { userId: string }[];
  likeCount: number;
}

/** ランキングリストのアイテム（上位数件） */
export interface RankingListItemSnippet {
  id: string;
  rank: number;
  itemName: string;
  imageUrl: string | null;
}

/** ランキングリスト概要 */
export interface RankingListSnippet {
  id: string;
  subject: string;
  description: string | null;
  listImageUrl: string | null;
  status: ListStatus;
  displayOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
  items: RankingListItemSnippet[];
  likes: { userId: string }[];
  likeCount: number;
  _count: { items: number };
}

/** ランキングリスト詳細表示用 */
export interface RankingListViewData {
  id: string;
  subject: string;
  description: string | null;
  status: ListStatus;
  listImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  author: UserSnippet;
  items: {
    id: string;
    rank: number;
    itemName: string;
    itemDescription: string | null;
    imageUrl: string | null;
  }[];
  tags: { id: string; name: string }[];
  _count: { items: number };
}

/** ランキング編集ページ用 */
export interface RankingListEditableData {
  id: string;
  subject: string;
  description: string | null;
  status: ListStatus;
  listImageUrl: string | null;
  author: { id: string; username: string };
  items: {
    id: string;
    rank: number;
    itemName: string;
    itemDescription: string | null;
    imageUrl: string | null;
  }[];
  tags: { id: string; name: string }[];
}

/** プロフィールページでのユーザーデータ */
export interface UserProfileData {
  id: string;
  clerkId: string;
  username: string;
  image: string | null;
  name: string | null;
  bio: string | null;
  coverImageUrl: string | null;
  location: string | null;
  birthday: Date | null;
  socialLinks: Record<string, string> | null;
  rankingLists: RankingListSnippet[];
  _count: {
    following: number;
    followedBy: number;
  };
}

/** SWR の key 型: ホーム／プロフィール両フィード用 */
export type FeedKey =
  | ["homeFeed", string | null, string | null]
  | ["profileFeed", string, string | null];

/** FeedItem＋関連情報 */
export interface FeedItemWithRelations {
  id: string;
  type: FeedType;
  createdAt: Date;
  updatedAt: Date;
  user: UserSnippet;
  post?: PostWithData | null;
  rankingList?: RankingListSnippet | null;
  retweetOfFeedItem?: FeedItemWithRelations | null;
  quotedFeedItem?: FeedItemWithRelations | null;
  quoteRetweetCount: number;
  _count: { retweets: number };
}

//フォローリクエストのステータス DB（Prisma）の FollowRequest.status 列に対応。申請中／承認／拒否 の３状態
// つまり「申請レコードのステータス」
export type FollowRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

// フロントエンドや汎用クエリで得られる「２者間の関係状態」を表す。自分自身／フォロー中／未フォロー／リクエスト送信済／リクエスト受信済／… など、UI 上で必要な多様なケースを列挙
//つまり「相手のプロフィールを見たときに表示すべき状態」
export type FollowStatus =
  | "SELF" // 自分自身
  | "NOT_FOLLOWING" // フォローしていない (公開アカウント)
  | "FOLLOWING" // フォロー中
  | "REQUEST_SENT" // フォローリクエスト送信済み (相手が非公開)
  | "REQUEST_RECEIVED" // 相手からフォローリクエストが来ている (承認待ち)
  | "BLOCKED" // 相手をブロックしている (将来的に実装する場合)
  | "BLOCKED_BY" // 相手からブロックされている (将来的に実装する場合)
  | "CANNOT_FOLLOW"; // フォローできないその他の理由 (例: ログインしていない)

// フォロー／フォロー解除／リクエスト承認・拒否などのアクション実行後に返す結果の状態。
// つまり「アクション結果を呼び出し元コンポーネントに返すための値」
export interface FollowActionResult extends ActionResult {
  status?: "following" | "not_following" | "requested" | "error";
}


// フォローリクエストを一覧取得するときの型
export interface FollowRequestWithRequester {
  id: string;
  requesterId: string;
  requestedId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: Date;
  updatedAt: Date;
  requester: UserSnippet;
}

// フォロー一覧ページ／タブで使うアイテム型
// 「フォロー中」「フォロワー」どちらも UserSnippet の配列を返すので追加不要ですが
// カーソル用に id（follow テーブルのレコードID）を含める場合は
export interface FollowCursorRecord {
  id: string;         // follow テーブルのレコードID（カーソル用）
  user: UserSnippet;  // following または follower の user 情報
}

export type FollowStatusInfo = {
  status: FollowStatus;
  targetUserId: string; // 対象ユーザーのDB ID
  targetUsername: string; // 対象ユーザーの username
  targetIsPrivate: boolean; // 対象ユーザーが非公開か
  // followRequestId?: string; // 送信済みリクエストのID (キャンセル用)
};