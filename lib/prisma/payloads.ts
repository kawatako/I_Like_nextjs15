// lib/prisma/payloads.ts

// — User Snニペット —
export const userSnippetSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const

// — Post ペイロード —
export const postPayload = {
  select: {
    id: true,
    content: true,
    imageUrl: true,
    createdAt: true,
    author: { select: userSnippetSelect },
    _count: { select: { replies: true } },
    likes: { select: { userId: true } },
    likeCount: true,
  },
} as const

// — RankingList スニペット —
export const rankingListSnippetSelect = {
  id: true,
  subject: true,
  description: true,
  listImageUrl: true,
  status: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { rank: 'asc' as const },
    take: 3,
    select: { id: true, rank: true, itemName: true, imageUrl: true },
  },
  likes: { select: { userId: true } },
  likeCount: true,
  _count: { select: { items: true } },
} as const

// — RankingList 編集用ペイロード —
export const rankingListEditSelect = {
  id: true,
  subject: true,
  description: true,
  status: true,
  listImageUrl: true,
  author: {
    select: { id: true, username: true },
  },
  items: {
    orderBy: { rank: 'asc' as const },
    select: { id: true, rank: true, itemName: true, itemDescription: true, imageUrl: true },
  },
  tags: {
    select: { id: true, name: true },
  },
} as const

// — RankingList 詳細表示用ペイロード —
export const rankingListViewSelect = {
  id: true,
  subject: true,
  description: true,
  status: true,
  listImageUrl: true,
  createdAt: true,
  updatedAt: true,
  likeCount: true,
  author: { select: userSnippetSelect },
  items: {
    orderBy: { rank: 'asc' as const },
    select: { id: true, rank: true, itemName: true, itemDescription: true, imageUrl: true },
  },
  tags: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} as const

// — ネストされた FeedItem 用セレクト —
export const nestedFeedItemSelect = {
  id: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  postId: true,
  rankingListId: true,
  quoteRetweetCount: true,
  user: { select: userSnippetSelect },
  post: { select: postPayload.select },
  rankingList: { select: rankingListSnippetSelect },
  _count: { select: { retweets: true } },
} as const

// — FeedItem ペイロード —
export const feedItemPayload = {
  select: {
    id: true,
    type: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    postId: true,
    rankingListId: true,
    retweetOfFeedItemId: true,
    quotedFeedItemId: true,
    quoteRetweetCount: true,
    user: { select: userSnippetSelect },
    post: { select: postPayload.select },
    rankingList: { select: rankingListSnippetSelect },
    _count: { select: { retweets: true } },
    retweetOfFeedItem: { select: nestedFeedItemSelect },
    quotedFeedItem: { select: nestedFeedItemSelect },
  },
} as const

// — UserProfile ペイロード —
export const userProfilePayload = {
  select: {
    id: true,
    clerkId: true,
    username: true,
    image: true,
    name: true,
    bio: true,
    coverImageUrl: true,
    location: true,
    birthday: true,
    socialLinks: true,
    createdAt: true,
    rankingLists: {
      where: { status: "PUBLISHED" },
      select: rankingListSnippetSelect,
      orderBy: [
        { displayOrder: 'asc' },
        { updatedAt:    'desc' },
      ],
    },
    _count: { select: { following: true, followedBy: true } },
  },
};
