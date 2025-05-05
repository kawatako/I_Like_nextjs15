// prisma/seed.ts
import {
  PrismaClient,
  ListStatus,
  FollowRequestStatus,
  FeedType,
  Prisma,
  User,
  RankingList,
  Post,
  FeedItem,
  Retweet,
  Like,
  RankedItem, // モデル型
  TrendPeriod,
  TrendingSubject,
  TrendingTag,
  TrendingItem,
} from "@prisma/client";
import { fakerJA as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Helper function (変更なし)
function createItemsData(itemNames: string[], descriptions?: string[]) {
  return itemNames.map((name, index) => ({
    itemName: name,
    rank: index + 1,
    itemDescription:
      descriptions?.[index] ?? faker.lorem.sentence({ min: 3, max: 7 }),
    imageUrl: null,
  }));
}

async function main() {
  console.log(`Start seeding ...`);

  // --- 1. 既存データの削除 
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
      bio: "Next.js 開発中",
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
  const createdRankingLists: RankingList[] = [];
  const publishedLists: RankingList[] = [];

  // userA, userB が作成するリストを増やす (例)
  const listSubjects = [
    "おすすめ作業用BGM",
    "好きな映画トップ5",
    "最近読んで面白かった技術書",
    "苦手な野菜ランキング",
    "好きなコードエディタ",
  ];
  const users = [userA, userB]; // userC は除く

  for (const author of users) {
    for (const subject of listSubjects) {
      // 半分くらいの確率でリストを作成
      if (faker.datatype.boolean()) {
        const status = faker.helpers.arrayElement([
          ListStatus.PUBLISHED,
          ListStatus.PUBLISHED,
          ListStatus.DRAFT,
        ]); // 公開されやすく
        const createdAt = faker.date.past({ years: 1 });
        const updatedAt = faker.date.between({
          from: createdAt,
          to: new Date(),
        });
        const description = faker.datatype.boolean()
          ? faker.lorem.sentence()
          : null;
        const items = createItemsData(
          Array.from(
            { length: faker.number.int({ min: 3, max: 8 }) },
            (_, k) => `${subject} Item ${k + 1}`
          )
        );
        const list = await prisma.rankingList.create({
          data: {
            subject,
            description,
            authorId: author.id,
            status,
            createdAt,
            updatedAt,
            items: { create: items },
          },
        });
        createdRankingLists.push(list);
        if (status === ListStatus.PUBLISHED) {
          publishedLists.push(list);
        }
      }
    }
  }
  // userkawa の下書き
  await prisma.rankingList.create({
    data: {
      subject: "いつか行きたい場所",
      authorId: userkawa.id,
      status: ListStatus.DRAFT,
      items: {
        create: createItemsData(["マチュピチュ", "ウユニ塩湖", "オーロラ"]),
      },
    },
  });
  console.log(
    `Created <span class="math-inline">\{createdRankingLists\.length\} ranking lists \(</span>{publishedLists.length} published).`
  );

  //追加のトレンドデータ
console.log("Creating 100 dummy ranking lists…");
const subjectsPool = Array.from({ length: 10 }, () => faker.lorem.words(2));
const allPublishedLists: { id: string; subject: string; createdAt: Date }[] = [];

for (let i = 0; i < 100; i++) {
  const author = faker.helpers.arrayElement([userA, userB, userC, userkawa]);
  const subject = faker.helpers.arrayElement(subjectsPool);
  const createdAt = faker.date.recent({ days: 30 });
  const status = ListStatus.PUBLISHED;
  const list = await prisma.rankingList.create({
    data: {
      subject,
      authorId: author.id,
      status,
      createdAt,
      updatedAt: createdAt,
      items: {
        create: Array.from(
          { length: faker.number.int({ min: 3, max: 10 }) },
          (_, idx) => ({
            itemName: faker.commerce.productName(),
            rank: idx + 1,
          })
        ),
      },
    },
    include: { items: true },
  });
  allPublishedLists.push({ id: list.id, subject, createdAt });
}
console.log("→ created", allPublishedLists.length, "lists");

  // --- 4. 投稿作成 ---
  console.log("Creating posts...");
  const createdPosts: Post[] = [];
  const createdPostFeedItems: FeedItem[] = [];

  for (const author of users) {
    // userA と userB が投稿
    for (let i = 0; i < faker.number.int({ min: 3, max: 6 }); i++) {
      // 各3〜6件投稿
      const content = faker.lorem.paragraph(
        faker.number.int({ min: 1, max: 3 })
      );
      const createdAt = faker.date.recent({ days: 30 }); // 過去30日以内
      const post = await prisma.post.create({
        data: { authorId: author.id, content, createdAt },
      });
      createdPosts.push(post);
      const feedItem = await prisma.feedItem.create({
        data: {
          userId: post.authorId,
          type: FeedType.POST,
          postId: post.id,
          createdAt: post.createdAt,
        },
      });
      createdPostFeedItems.push(feedItem);
    }
  }
  console.log(`Created ${createdPosts.length} posts.`);

  // --- 5. ランキング更新 FeedItem 作成 ---
  console.log("Creating ranking update feed items...");
  const createdRankingFeedItems: FeedItem[] = [];
  for (const list of publishedLists) {
    // userA, userB が作成したもののみ
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
  await prisma.follow.createMany({
    data: [
      { followerId: userA.id, followingId: userB.id },
      { followerId: userA.id, followingId: userkawa.id },
      { followerId: userB.id, followingId: userA.id },
      { followerId: userB.id, followingId: userkawa.id },
      { followerId: userC.id, followingId: userB.id },
      { followerId: userkawa.id, followingId: userA.id },
      { followerId: userkawa.id, followingId: userB.id },
    ],
    skipDuplicates: true,
  });
  console.log("Follow relationships created.");

  // --- 7. フォローリクエストを作成 ---
  console.log("Creating follow requests...");
  try {
    if (userC) {
      await prisma.followRequest.createMany({
        data: [
          {
            requesterId: userA.id,
            requestedId: userC.id,
            status: FollowRequestStatus.PENDING,
          },
          {
            requesterId: userkawa.id,
            requestedId: userC.id,
            status: FollowRequestStatus.PENDING,
          },
        ],
        skipDuplicates: true,
      });
      console.log("Follow requests created.");
    }
  } catch (e) {
    console.error("Error creating follow requests:", e);
  }

  // --- 8. リツイートと関連 FeedItem 作成 ---
  console.log("Creating retweets and related feed items...");
  const retweetFeedItems: FeedItem[] = [];
  // userkawa が alice と bob の FeedItem をいくつかリツイートする
  const kawaTargets = [
    ...createdPostFeedItems,
    ...createdRankingFeedItems,
  ].filter((f) => f.userId === userA.id || f.userId === userB.id);
  for (let i = 0; i < Math.min(kawaTargets.length, 4); i++) {
    // 最大4件RT
    if (faker.datatype.boolean(0.7)) {
      // 70% の確率でRT
      const target = faker.helpers.arrayElement(kawaTargets);
      // 重複チェック (本来は DB 制約に任せるか findFirst)
      const existing = await prisma.retweet.findUnique({
        where: {
          userId_feedItemId: { userId: userkawa.id, feedItemId: target.id },
        },
      });
      if (!existing) {
        await prisma.retweet.create({
          data: { userId: userkawa.id, feedItemId: target.id },
        });
        const rtItem = await prisma.feedItem.create({
          data: {
            userId: userkawa.id,
            type: FeedType.RETWEET,
            retweetOfFeedItemId: target.id,
            createdAt: faker.date.recent({ days: 5 }),
          },
        });
        retweetFeedItems.push(rtItem);
      }
    }
  }
  // alice が bob の FeedItem をいくつかリツイート
  const aliceTargets = [
    ...createdPostFeedItems,
    ...createdRankingFeedItems,
  ].filter((f) => f.userId === userB.id);
  for (let i = 0; i < Math.min(aliceTargets.length, 3); i++) {
    if (faker.datatype.boolean(0.6)) {
      const target = faker.helpers.arrayElement(aliceTargets);
      const existing = await prisma.retweet.findUnique({
        where: {
          userId_feedItemId: { userId: userA.id, feedItemId: target.id },
        },
      });
      if (!existing) {
        await prisma.retweet.create({
          data: { userId: userA.id, feedItemId: target.id },
        });
        const rtItem = await prisma.feedItem.create({
          data: {
            userId: userA.id,
            type: FeedType.RETWEET,
            retweetOfFeedItemId: target.id,
            createdAt: faker.date.recent({ days: 4 }),
          },
        });
        retweetFeedItems.push(rtItem);
      }
    }
  }
  // bob が alice の FeedItem をいくつかリツイート
  const bobTargets = [
    ...createdPostFeedItems,
    ...createdRankingFeedItems,
  ].filter((f) => f.userId === userA.id);
  for (let i = 0; i < Math.min(bobTargets.length, 3); i++) {
    if (faker.datatype.boolean(0.6)) {
      const target = faker.helpers.arrayElement(bobTargets);
      const existing = await prisma.retweet.findUnique({
        where: {
          userId_feedItemId: { userId: userB.id, feedItemId: target.id },
        },
      });
      if (!existing) {
        await prisma.retweet.create({
          data: { userId: userB.id, feedItemId: target.id },
        });
        const rtItem = await prisma.feedItem.create({
          data: {
            userId: userB.id,
            type: FeedType.RETWEET,
            retweetOfFeedItemId: target.id,
            createdAt: faker.date.recent({ days: 3 }),
          },
        });
        retweetFeedItems.push(rtItem);
      }
    }
  }
  console.log(`Created ${retweetFeedItems.length} retweets.`);

  // --- 9. 引用リツイートと関連 FeedItem 作成 ---
  console.log("Creating quote retweets and related feed items...");
  // userkawa が alice/bob の FeedItem をいくつか引用RT
  const kawaQuoteTargets = [
    ...createdPostFeedItems,
    ...createdRankingFeedItems,
    ...retweetFeedItems,
  ].filter((f) => f.userId === userA.id || f.userId === userB.id);
  for (let i = 0; i < Math.min(kawaQuoteTargets.length, 3); i++) {
    if (faker.datatype.boolean(0.5)) {
      const target = faker.helpers.arrayElement(kawaQuoteTargets);
      const quotePost = await prisma.post.create({
        data: {
          authorId: userkawa.id,
          content: `これについて一言！ ${faker.lorem.sentence()}`,
        },
      });
      await prisma.feedItem.create({
        data: {
          userId: userkawa.id,
          type: FeedType.QUOTE_RETWEET,
          postId: quotePost.id,
          quotedFeedItemId: target.id,
          createdAt: quotePost.createdAt,
        },
      });
      await prisma.feedItem.update({
        where: { id: target.id },
        data: { quoteRetweetCount: { increment: 1 } },
      });
    }
  }
  // alice が bob の FeedItem を引用RT
  const aliceQuoteTargets = [
    ...createdPostFeedItems,
    ...createdRankingFeedItems,
    ...retweetFeedItems,
  ].filter((f) => f.userId === userB.id);
  for (let i = 0; i < Math.min(aliceQuoteTargets.length, 2); i++) {
    if (faker.datatype.boolean(0.4)) {
      const target = faker.helpers.arrayElement(aliceQuoteTargets);
      const quotePost = await prisma.post.create({
        data: {
          authorId: userA.id,
          content: `Bob のこれ、わかる〜 ${faker.lorem.sentence()}`,
        },
      });
      await prisma.feedItem.create({
        data: {
          userId: userA.id,
          type: FeedType.QUOTE_RETWEET,
          postId: quotePost.id,
          quotedFeedItemId: target.id,
          createdAt: quotePost.createdAt,
        },
      });
      await prisma.feedItem.update({
        where: { id: target.id },
        data: { quoteRetweetCount: { increment: 1 } },
      });
    }
  }
  console.log("Quote retweets created.");

  // --- 10. いいね作成 (対象: Post / RankingList) ---
  console.log("Creating likes...");
  try {
    // userkawa が alice/bob の投稿やリストにいいね
    const kawaLikePosts = createdPosts.filter(
      (p) => p.authorId === userA.id || p.authorId === userB.id
    );
    const kawaLikeLists = createdRankingLists.filter(
      (l) => l.authorId === userA.id || l.authorId === userB.id
    );
    for (let i = 0; i < Math.min(kawaLikePosts.length, 5); i++) {
      // 最大5件いいね
      if (faker.datatype.boolean(0.6)) {
        const target = faker.helpers.arrayElement(kawaLikePosts);
        await prisma.like.create({
          data: { userId: userkawa.id, postId: target.id },
        });
        await prisma.post.update({
          where: { id: target.id },
          data: { likeCount: { increment: 1 } },
        });
      }
    }
    for (let i = 0; i < Math.min(kawaLikeLists.length, 5); i++) {
      if (faker.datatype.boolean(0.6)) {
        const target = faker.helpers.arrayElement(kawaLikeLists);
        await prisma.like.create({
          data: { userId: userkawa.id, rankingListId: target.id },
        });
        await prisma.rankingList.update({
          where: { id: target.id },
          data: { likeCount: { increment: 1 } },
        });
      }
    }
    // alice が bob の投稿/リストにいいね
    const aliceLikePosts = createdPosts.filter((p) => p.authorId === userB.id);
    const aliceLikeLists = createdRankingLists.filter(
      (l) => l.authorId === userB.id
    );
    for (let i = 0; i < Math.min(aliceLikePosts.length, 3); i++) {
      if (faker.datatype.boolean(0.5)) {
        const target = faker.helpers.arrayElement(aliceLikePosts);
        await prisma.like.create({
          data: { userId: userA.id, postId: target.id },
        });
        await prisma.post.update({
          where: { id: target.id },
          data: { likeCount: { increment: 1 } },
        });
      }
    }
    for (let i = 0; i < Math.min(aliceLikeLists.length, 3); i++) {
      if (faker.datatype.boolean(0.5)) {
        const target = faker.helpers.arrayElement(aliceLikeLists);
        await prisma.like.create({
          data: { userId: userA.id, rankingListId: target.id },
        });
        await prisma.rankingList.update({
          where: { id: target.id },
          data: { likeCount: { increment: 1 } },
        });
      }
    }
    // bob が alice の投稿/リストにいいね
    const bobLikePosts = createdPosts.filter((p) => p.authorId === userA.id);
    const bobLikeLists = createdRankingLists.filter(
      (l) => l.authorId === userA.id
    );
    for (let i = 0; i < Math.min(bobLikePosts.length, 3); i++) {
      if (faker.datatype.boolean(0.5)) {
        const target = faker.helpers.arrayElement(bobLikePosts);
        await prisma.like.create({
          data: { userId: userB.id, postId: target.id },
        });
        await prisma.post.update({
          where: { id: target.id },
          data: { likeCount: { increment: 1 } },
        });
      }
    }
    for (let i = 0; i < Math.min(bobLikeLists.length, 3); i++) {
      if (faker.datatype.boolean(0.5)) {
        const target = faker.helpers.arrayElement(bobLikeLists);
        await prisma.like.create({
          data: { userId: userB.id, rankingListId: target.id },
        });
        await prisma.rankingList.update({
          where: { id: target.id },
          data: { likeCount: { increment: 1 } },
        });
      }
    }

    console.log("Like data created.");
  } catch (error) {
    console.error("Error creating like data:", error);
  }

  console.log("Seeding TrendingSubject / TrendingTag / TrendingItem…");
// 週次 SUBJECT
await prisma.$executeRawUnsafe(`
  INSERT INTO public."TrendingSubject"
    ("id", "subject", "count", "period", "calculationDate")
  SELECT
    gen_random_uuid()                          AS "id",
    rl.subject                                 AS "subject",
    COUNT(*)                                   AS "count",
    '${TrendPeriod.WEEKLY}'::"TrendPeriod"     AS "period",
    date_trunc('day', now())                   AS "calculationDate"
  FROM public."RankingList" AS rl
  WHERE rl.status = 'PUBLISHED'
    AND rl."createdAt" >= now() - INTERVAL '7 days'
  GROUP BY rl.subject;
`);

// 月次 SUBJECT
await prisma.$executeRawUnsafe(`
  INSERT INTO public."TrendingSubject"
    ("id", "subject", "count", "period", "calculationDate")
  SELECT
    gen_random_uuid()                          AS "id",
    rl.subject                                 AS "subject",
    COUNT(*)                                   AS "count",
    '${TrendPeriod.MONTHLY}'::"TrendPeriod"    AS "period",
    date_trunc('day', now())                   AS "calculationDate"
  FROM public."RankingList" AS rl
  WHERE rl.status = 'PUBLISHED'
    AND rl."createdAt" >= now() - INTERVAL '30 days'
  GROUP BY rl.subject;
`);

// 週次 TAG
await prisma.$executeRawUnsafe(`
  INSERT INTO public."TrendingTag"
    ("id", "tagId", "tagName", "count", "period", "calculationDate")
  SELECT
    gen_random_uuid()                          AS "id",
    t.id                                       AS "tagId",
    t.name                                     AS "tagName",
    COUNT(*)                                   AS "count",
    '${TrendPeriod.WEEKLY}'::"TrendPeriod"     AS "period",
    date_trunc('day', now())                   AS "calculationDate"
  FROM public."_RankingListTags" AS p
    JOIN public."Tag"         AS t  ON t.id = p."B"
    JOIN public."RankingList" AS rl ON rl.id = p."A"
  WHERE rl.status = 'PUBLISHED'
    AND rl."createdAt" >= now() - INTERVAL '7 days'
  GROUP BY
    t.id,
    t.name;
`);

// 週次 ITEM
await prisma.$executeRawUnsafe(`
  INSERT INTO public."TrendingItem"
    ("id", "itemName", "rankScore", "period", "calculationDate")
  SELECT
    gen_random_uuid()                                  AS "id",
    ri."itemName"                                      AS "itemName",
    SUM(
      CASE
        WHEN ri.rank = 1 THEN 3
        WHEN ri.rank = 2 THEN 2
        ELSE 1
      END
    )::float                                           AS "rankScore",
    '${TrendPeriod.WEEKLY}'::"TrendPeriod"             AS "period",
    date_trunc('day', now())                           AS "calculationDate"
  FROM public."RankedItem"   AS ri
    JOIN public."RankingList" AS rl ON rl.id = ri."listId"
  WHERE rl.status = 'PUBLISHED'
    AND rl."createdAt" >= now() - INTERVAL '7 days'
  GROUP BY
    ri."itemName";
`);
  console.log(`Seeding finished.`);

    // --- 11. AverageItemRank シード (全期間) ---
    console.log("Seeding AverageItemRank...");
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."AverageItemRank"
        (id, subject, "itemName", "avgRank", count, "calculationDate")
      SELECT
        gen_random_uuid()          AS "id",
        rl.subject                 AS "subject",
        ri."itemName"              AS "itemName",      
        ROUND(AVG(ri.rank)::numeric, 2) AS "avgRank",
        COUNT(*) AS count,
        date_trunc('day', NOW()) AS "calculationDate"
      FROM public."RankedItem" ri
      JOIN public."RankingList" rl ON rl.id = ri."listId"
      WHERE rl.status = 'PUBLISHED'
      GROUP BY rl.subject, ri."itemName"
      ORDER BY rl.subject, AVG(ri.rank)
    `);
    console.log("AverageItemRank seeded.");
} // --- main 関数の終わり ---

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


