import { PrismaClient } from "@prisma/client";
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
  const createdRankingLists = [];
  const publishedLists      = [];

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
      if (faker.datatype.boolean()) {
        const status = faker.helpers.arrayElement([
          "PUBLISHED",
          "PUBLISHED",
          "DRAFT",
        ]);
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
        if (status === "PUBLISHED") {
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
      status: "DRAFT",
      items: {
        create: createItemsData(["マチュピチュ", "ウユニ塩湖", "オーロラ"]),
      },
    },
  });

  console.log(
    `Created ${createdRankingLists.length} ranking lists (${publishedLists.length} published).`
  );

  // --- 追加のトレンドデータ ---
  console.log("Creating 100 dummy ranking lists…");
  const subjectsPool = Array.from({ length: 10 }, () => faker.lorem.words(2));
  const allPublishedLists: { id: string; subject: string; createdAt: Date }[] = [];

  for (let i = 0; i < 100; i++) {
    const author = faker.helpers.arrayElement([userA, userB, userC, userkawa]);
    const subject = faker.helpers.arrayElement(subjectsPool);
    const createdAt = faker.date.recent({ days: 30 });
    const list = await prisma.rankingList.create({
      data: {
        subject,
        authorId: author.id,
        status: "PUBLISHED",
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
  const createdPosts = [];
  const createdFeedItems = [];

  for (const author of users) {
    for (let i = 0; i < faker.number.int({ min: 3, max: 6 }); i++) {
      const content = faker.lorem.paragraph(faker.number.int({ min: 1, max: 3 }));
      const createdAt = faker.date.recent({ days: 30 });
      const post = await prisma.post.create({
        data: { authorId: author.id, content, createdAt },
      });
      createdPosts.push(post);
      const feedItem = await prisma.feedItem.create({
        data: {
          userId: post.authorId,
          type: "POST",
          postId: post.id,
          createdAt: post.createdAt,
        },
      });
      createdFeedItems.push(feedItem);
    }
  }
  console.log(`Created ${createdPosts.length} posts.`);

  // --- 5. ランキング更新 FeedItem 作成 ---
  console.log("Creating ranking update feed items...");
  const createdRankingFeedItems　= [];
  for (const list of publishedLists) {
    if (list.authorId === userA.id || list.authorId === userB.id) {
      const feedItem = await prisma.feedItem.create({
        data: {
          userId: list.authorId,
          type: "RANKING_UPDATE",
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
  if (userC) {
    await prisma.followRequest.createMany({
      data: [
        {
          requesterId: userA.id,
          requestedId: userC.id,
          status: "PENDING",
        },
        {
          requesterId: userkawa.id,
          requestedId: userC.id,
          status: "PENDING",
        },
      ],
      skipDuplicates: true,
    });
    console.log("Follow requests created.");
  }

  // --- 8. リツイートと関連 FeedItem 作成 ---
  console.log("Creating retweets and related feed items...");
  const retweetFeedItems  = [];
  const kawaTargets = [...createdFeedItems, ...createdRankingFeedItems]
    .filter(f => f.userId === userA.id || f.userId === userB.id);

  for (let i = 0; i < Math.min(kawaTargets.length, 4); i++) {
    if (faker.datatype.boolean(0.7)) {
      const target = faker.helpers.arrayElement(kawaTargets);
      const exists = await prisma.retweet.findUnique({
        where: { userId_feedItemId: { userId: userkawa.id, feedItemId: target.id } },
      });
      if (!exists) {
        await prisma.retweet.create({
          data: { userId: userkawa.id, feedItemId: target.id },
        });
        const rtItem = await prisma.feedItem.create({
          data: {
            userId: userkawa.id,
            type: "RETWEET",
            retweetOfFeedItemId: target.id,
            createdAt: faker.date.recent({ days: 5 }),
          },
        });
        retweetFeedItems.push(rtItem);
      }
    }
  }
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
