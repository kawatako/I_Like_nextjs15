// prisma/seed.ts
import {
  PrismaClient,
  Sentiment,
  ListStatus,
  FollowRequestStatus,
  FeedType,
  Prisma,
  // ★ モデル型をインポート ★
  User,
  RankingList,
  Post,
  FeedItem,
  Retweet,
  Like,
  RankedItem,
} from "@prisma/client";
import { fakerJA as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Helper function to create item data easily
function createItemsData(itemNames: string[], descriptions?: string[]) {
  // imageUrl は一旦削除
  return itemNames.map((name, index) => ({
    itemName: name,
    rank: index + 1,
    itemDescription:
      descriptions?.[index] ??
      faker.lorem.sentence(faker.number.int({ min: 3, max: 7 })),
    imageUrl: null, // 画像は null
  }));
}

async function main() {
  console.log(`Start seeding ...`);

  // --- 1. 既存データの削除 ---
  console.log("Deleting existing data...");
  await prisma.like.deleteMany();
  await prisma.retweet.deleteMany();
  await prisma.reply.deleteMany();
  await prisma.feedItem.deleteMany();
  await prisma.rankedItem.deleteMany();
  await prisma.post.deleteMany();
  await prisma.rankingList.deleteMany();
  await prisma.followRequest.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();
  console.log("Existing data deleted.");

  // --- 2. ユーザー作成 ---
  console.log("Creating users...");
  // ★★★ あなた自身の Clerk ID と Username に必ず書き換えてください ★★★
  const userkawa = await prisma.user.create({
    data: {
      clerkId: "user_2vJBIO0LzcNTHBgdd1ItnBKTYSA",
      username: "kawatako",
      name: "ショウタ カワタ",
      image: null,
      bio: "...",
      isPrivate: false,
    },
  });
  const userA = await prisma.user.create({
    data: {
      clerkId: faker.string.uuid(),
      username: "alice",
      name: "Alice Apple",
      image: null,
      bio: faker.lorem.paragraph(),
      isPrivate: false,
    },
  });
  const userB = await prisma.user.create({
    data: {
      clerkId: faker.string.uuid(),
      username: "bob",
      name: "Bob Banana",
      image: null,
      bio: faker.lorem.paragraph(),
      isPrivate: false,
    },
  });
  const userC = await prisma.user.create({
    data: {
      clerkId: faker.string.uuid(),
      username: "carol",
      name: "Carol Cherry",
      image: null,
      bio: faker.lorem.paragraph(),
      isPrivate: true,
    },
  });
  console.log("Users created:", userkawa.id, userA.id, userB.id, userC.id);

  // --- 3. ランキングリストとアイテム作成 ---
  console.log("Creating ranking lists and items...");
  // ★ 配列に型注釈を追加 ★
  const createdRankingLists: RankingList[] = [];
  const publishedLists: RankingList[] = []; // 公開リストのみ保持

  const popularSubject = "おすすめ作業用BGM";
  const listA1_data = {
    sentiment: Sentiment.LIKE,
    subject: popularSubject,
    authorId: userA.id,
    status: ListStatus.PUBLISHED,
    description: "集中できるBGM",
    updatedAt: faker.date.recent({ days: 2 }),
    items: {
      create: createItemsData([
        "Lo-fi Hip Hop Radio",
        "ヒーリングミュージック",
        "ゲームサウンドトラック",
      ]),
    },
  };
  const listA1 = await prisma.rankingList.create({ data: listA1_data });
  createdRankingLists.push(listA1);
  publishedLists.push(listA1);

  const listB1_data = {
    sentiment: Sentiment.LIKE,
    subject: popularSubject,
    authorId: userB.id,
    status: ListStatus.PUBLISHED,
    description: "私のベスト３",
    updatedAt: faker.date.recent({ days: 4 }),
    items: {
      create: createItemsData([
        "ヒーリングミュージック",
        "Lo-fi Hip Hop Radio",
        "カフェミュージック",
      ]),
    },
  };
  const listB1 = await prisma.rankingList.create({ data: listB1_data });
  createdRankingLists.push(listB1);
  publishedLists.push(listB1);

  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE,
      subject: popularSubject,
      authorId: userC.id,
      status: ListStatus.PUBLISHED,
      updatedAt: faker.date.recent({ days: 10 }),
      items: {
        create: createItemsData([
          "ゲームサウンドトラック",
          "Lo-fi Hip Hop Radio",
          "自然の音",
        ]),
      },
    },
  });
  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE,
      subject: popularSubject,
      authorId: userA.id,
      status: ListStatus.DRAFT,
      items: { create: createItemsData(["考え中1", "考え中2"]) },
    },
  });

  const listA2_data = {
    sentiment: Sentiment.DISLIKE,
    subject: popularSubject,
    authorId: userA.id,
    status: ListStatus.PUBLISHED,
    description: "これは苦手...",
    updatedAt: faker.date.recent({ days: 3 }),
    items: { create: createItemsData(["うるさいBGM", "単調なBGM"]) },
  };
  const listA2 = await prisma.rankingList.create({ data: listA2_data });
  createdRankingLists.push(listA2);
  publishedLists.push(listA2);

  const listB2_data = {
    sentiment: Sentiment.LIKE,
    subject: "今週読んだ本",
    authorId: userB.id,
    status: ListStatus.PUBLISHED,
    updatedAt: faker.date.recent({ days: 1 }),
    items: { create: createItemsData(["小説A", "技術書B"]) },
  };
  const listB2 = await prisma.rankingList.create({ data: listB2_data });
  createdRankingLists.push(listB2);
  publishedLists.push(listB2);

  for (let i = 0; i < 5; i++) {
    const user = faker.helpers.arrayElement([userA, userB]);
    const sentiment = faker.helpers.arrayElement([
      Sentiment.LIKE,
      Sentiment.DISLIKE,
    ]);
    const subject = faker.lorem.words({ min: 3, max: 6 });
    const createdAt = faker.date.past({ years: 1 });
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
    const randomList_data = {
      sentiment,
      subject,
      authorId: user.id,
      status: ListStatus.PUBLISHED,
      createdAt,
      updatedAt,
      items: {
        create: createItemsData(
          Array.from(
            { length: faker.number.int({ min: 2, max: 7 }) },
            (_, k) => faker.commerce.productName() + `_${k}`
          )
        ),
      },
    };
    const randomList = await prisma.rankingList.create({
      data: randomList_data,
    });
    createdRankingLists.push(randomList);
    publishedLists.push(randomList);
  }

  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.DISLIKE,
      subject: "いつか行きたい場所",
      authorId: userkawa.id,
      status: ListStatus.DRAFT,
      items: {
        create: createItemsData(["マチュピチュ", "ウユニ塩湖", "オーロラ"]),
      },
    },
  });
  console.log("Ranking lists and items created.");

  // --- 4. 投稿作成 ---
  console.log("Creating posts...");
  // ★ 配列に型注釈を追加 ★
  const createdPosts: Post[] = [];
  const createdPostFeedItems: FeedItem[] = [];

  const postA1_data = {
    authorId: userA.id,
    content: "今日のランチ美味しかった！ #飯テロ",
  };
  const postA1 = await prisma.post.create({ data: postA1_data });
  createdPosts.push(postA1);
  const feedItemPA1 = await prisma.feedItem.create({
    data: {
      userId: postA1.authorId,
      type: FeedType.POST,
      postId: postA1.id,
      createdAt: postA1.createdAt,
    },
  });
  createdPostFeedItems.push(feedItemPA1);

  const postA2_data = { authorId: userA.id, content: faker.lorem.paragraph(1) };
  const postA2 = await prisma.post.create({ data: postA2_data });
  createdPosts.push(postA2);
  const feedItemPA2 = await prisma.feedItem.create({
    data: {
      userId: postA2.authorId,
      type: FeedType.POST,
      postId: postA2.id,
      createdAt: postA2.createdAt,
    },
  });
  createdPostFeedItems.push(feedItemPA2);

  const postB1_data = {
    authorId: userB.id,
    content: "Supabase と Prisma の組み合わせ、なかなか良い感じ。",
  };
  const postB1 = await prisma.post.create({ data: postB1_data });
  createdPosts.push(postB1);
  const feedItemPB1 = await prisma.feedItem.create({
    data: {
      userId: postB1.authorId,
      type: FeedType.POST,
      postId: postB1.id,
      createdAt: postB1.createdAt,
    },
  });
  createdPostFeedItems.push(feedItemPB1);

  const postB2_data = { authorId: userB.id, content: faker.lorem.sentence() };
  const postB2 = await prisma.post.create({ data: postB2_data });
  createdPosts.push(postB2);
  const feedItemPB2 = await prisma.feedItem.create({
    data: {
      userId: postB2.authorId,
      type: FeedType.POST,
      postId: postB2.id,
      createdAt: postB2.createdAt,
    },
  });
  createdPostFeedItems.push(feedItemPB2);

  console.log("Posts created.");

  // --- 5. ランキング更新 FeedItem 作成 ---
  console.log("Creating ranking update feed items...");
  // ★ 配列に型注釈を追加 ★
  const createdRankingFeedItems: FeedItem[] = [];
  // ★ for...of と 型注釈 (または filter を先に行う) ★
  for (const list of publishedLists) {
    // list は RankingList 型
    if (list.authorId === userA.id || list.authorId === userB.id) {
      const feedItem = await prisma.feedItem.create({
        data: {
          userId: list.authorId,
          type: FeedType.RANKING_UPDATE,
          rankingListId: list.id,
          createdAt: list.updatedAt,
        },
      });
      createdRankingFeedItems.push(feedItem);
    }
  }
  console.log("Ranking update feed items created.");

  // --- 6. フォロー関係を作成 ---
  console.log("Creating follow relationships...");
  // ... (変更なし) ...
  console.log("Follow relationships created.");

  // --- 7. フォローリクエストを作成 ---
  console.log("Creating follow requests...");
  // ... (変更なし) ...
  console.log("Follow requests created.");

  // --- 8. リツイートと関連 FeedItem 作成 ---
  console.log("Creating retweets and related feed items...");
  // ★ 配列に型注釈を追加 ★
  const retweetFeedItems: FeedItem[] = [];
  if (createdPostFeedItems.length > 0) {
    const targetFeedItemA = createdPostFeedItems[0];
    // ★ prisma.retweet.create を使用 ★
    await prisma.retweet.create({
      data: { userId: userkawa.id, feedItemId: targetFeedItemA.id },
    });
    const retweetFeedItem = await prisma.feedItem.create({
      data: {
        userId: userkawa.id,
        type: FeedType.RETWEET,
        retweetOfFeedItemId: targetFeedItemA.id,
        createdAt: faker.date.recent({ days: 1 }),
      },
    });
    retweetFeedItems.push(retweetFeedItem);
    // 元 FeedItem の retweetCount は _count で取得するため更新不要
  }
  if (createdRankingFeedItems.length > 0) {
    const targetFeedItemB = createdRankingFeedItems[0];
    // ★ prisma.retweet.create を使用 ★
    await prisma.retweet.create({
      data: { userId: userA.id, feedItemId: targetFeedItemB.id },
    });
    const retweetFeedItem2 = await prisma.feedItem.create({
      data: {
        userId: userA.id,
        type: FeedType.RETWEET,
        retweetOfFeedItemId: targetFeedItemB.id,
        createdAt: faker.date.recent({ days: 0.5 }),
      },
    });
    retweetFeedItems.push(retweetFeedItem2);
  }
  console.log("Retweets and related feed items created.");

  // --- 9. 引用リツイートと関連 FeedItem 作成 ---
  console.log("Creating quote retweets and related feed items...");
  if (createdPostFeedItems.length > 1) {
    const targetFeedItemA2 = createdPostFeedItems[1];
    const quotePost_data = {
      authorId: userB.id,
      content: `この意見、興味深いですね！ ${faker.lorem.sentence()}`,
    };
    const quotePost = await prisma.post.create({ data: quotePost_data });
    const quoteFeedItem_data = {
      userId: userB.id,
      type: FeedType.QUOTE_RETWEET,
      postId: quotePost.id,
      quotedFeedItemId: targetFeedItemA2.id,
      createdAt: quotePost.createdAt,
    };
    await prisma.feedItem.create({ data: quoteFeedItem_data });
    // ★ 元 FeedItem の quoteRetweetCount をインクリメント ★
    await prisma.feedItem.update({
      where: { id: targetFeedItemA2.id },
      data: { quoteRetweetCount: { increment: 1 } },
    });
  }
  // ★ let で再代入可能にする ★
  let targetRetweetFeedItem: FeedItem | undefined =
    retweetFeedItems.length > 1 ? retweetFeedItems[1] : undefined; // userA がした RT
  if (targetRetweetFeedItem) {
    // undefined チェック
    const quotePost2_data = {
      authorId: userkawa.id,
      content: `これ、私もリツイートしました！👍`,
    };
    const quotePost2 = await prisma.post.create({ data: quotePost2_data });
    const quoteFeedItem2_data = {
      userId: userkawa.id,
      type: FeedType.QUOTE_RETWEET,
      postId: quotePost2.id,
      quotedFeedItemId: targetRetweetFeedItem.id,
      createdAt: quotePost2.createdAt,
    };
    await prisma.feedItem.create({ data: quoteFeedItem2_data });
    // ★ 元 FeedItem の quoteRetweetCount をインクリメント ★
    await prisma.feedItem.update({
      where: { id: targetRetweetFeedItem.id },
      data: { quoteRetweetCount: { increment: 1 } },
    });
  }
  console.log("Quote retweets and related feed items created.");

  // --- 10. いいね作成 (対象: Post / RankingList) ---
  console.log("Creating likes...");
  try {
    // ★ like.create の data を修正: postId または rankingListId を指定 ★
    if (createdPosts.length > 0) {
      await prisma.like.create({
        data: { userId: userkawa.id, postId: createdPosts[0].id },
      }); // userA の最初の投稿
      await prisma.post.update({
        where: { id: createdPosts[0].id },
        data: { likeCount: { increment: 1 } },
      });
    }
    if (createdRankingLists.length > 1) {
      // createdRankingLists[1] は listB1 (userB 作成)
      await prisma.like.create({
        data: { userId: userkawa.id, rankingListId: createdRankingLists[1].id },
      });
      await prisma.rankingList.update({
        where: { id: createdRankingLists[1].id },
        data: { likeCount: { increment: 1 } },
      });
    }
    if (createdPosts.length > 2) {
      // createdPosts[2] は postB1 (userB 作成)
      await prisma.like.create({
        data: { userId: userA.id, postId: createdPosts[2].id },
      });
      await prisma.post.update({
        where: { id: createdPosts[2].id },
        data: { likeCount: { increment: 1 } },
      });
    }
    if (createdRankingLists.length > 0) {
      // createdRankingLists[0] は listA1 (userA 作成)
      await prisma.like.create({
        data: { userId: userB.id, rankingListId: createdRankingLists[0].id },
      });
      await prisma.rankingList.update({
        where: { id: createdRankingLists[0].id },
        data: { likeCount: { increment: 1 } },
      });
    }
    console.log("Like data created.");
  } catch (error) {
    console.error("Error creating like data:", error);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
