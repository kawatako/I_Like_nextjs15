// prisma/seed.ts
import { PrismaClient, Sentiment, ListStatus } from '@prisma/client';
import { fakerJA as faker } from '@faker-js/faker'; // 日本語用 Faker

const prisma = new PrismaClient();

// Helper function to create item data easily
// (アイテム名、説明、画像の配列を受け取って Prisma の createMany 用データ形式にする)
function createItemsData(itemNames: string[], descriptions?: string[], imageBaseUrl?: string | null) {
  return itemNames.map((name, index) => ({
    itemName: name,
    rank: index + 1,
    itemDescription: descriptions?.[index] ?? faker.lorem.sentence(faker.number.int({min: 3, max: 7})), // ランダムな説明文
    // imageUrl: imageBaseUrl ? `${imageBaseUrl}${index + 1}` : (faker.datatype.boolean(0.6) ? faker.image.urlLoremFlickr({ category: 'abstract', width: 128, height: 128 }) : null), // 6割画像あり
    imageUrl: faker.datatype.boolean(0.6) ? faker.image.urlPicsumPhotos({ width: 128, height: 128 }) : null, // LoremFlickr より Picsum の方が安定しているかも

  }));
}

async function main() {
  console.log(`Start seeding ...`);

  // --- 1. 既存データの削除 ---
  console.log('Deleting existing data...');
  // 関連の深い RankedItem から削除
  await prisma.rankedItem.deleteMany();
  await prisma.rankingList.deleteMany();
  // 他のモデル (Post, Like, Follow など) も必要なら削除
  // await prisma.like.deleteMany();
  // await prisma.reply.deleteMany();
  // await prisma.post.deleteMany();
  // await prisma.follow.deleteMany();
  // 最後に User を削除 (onDelete: Cascade が設定されていれば関連データも消える)
  await prisma.user.deleteMany();
  console.log('Existing data deleted.');

  // --- 2. ユーザー作成 ---

  const userkawa = await prisma.user.create({
    data: {
      // ↓↓↓ ここをあなたの実際の Clerk ID に書き換える！ ↓↓↓
      clerkId: 'user_2vJBIO0LzcNTHBgdd1ItnBKTYSA', // あなたの Clerk ID
      // ↓↓↓ ここもあなたの Clerk ユーザー名に合わせると良い ↓↓↓
      username: 'kawatako', // 例: 'kawatako' など
      name: 'kawatako', // 例: ''
      image: faker.image.avatarGitHub(), // 画像はダミーでもOK
      bio: faker.lorem.paragraph(),
    },
  });
  console.log('Creating users...');
  const userA = await prisma.user.create({
    data: {
      clerkId: 'user_aaaaaaaaaaaaaaaaaaaa', // Clerk で実際に作るか、固定のダミーID
      username: 'alice',
      name: 'Alice Apple',
      image: faker.image.avatarGitHub(),
      bio: faker.lorem.paragraph(),
    },
  });
  const userB = await prisma.user.create({
    data: {
      clerkId: 'user_bbbbbbbbbbbbbbbbbbbb',
      username: 'bob',
      name: 'Bob Banana',
      image: faker.image.avatarGitHub(),
      bio: faker.lorem.paragraph(),
    },
  });
  const userC = await prisma.user.create({
    data: {
      clerkId: 'user_cccccccccccccccccccc',
      username: 'carol',
      name: 'Carol Cherry',
      image: faker.image.avatarGitHub(),
    },
  });
  console.log('Users created:', userA.id, userB.id, userC.id);

  // --- 3. ランキングリストとアイテム作成 ---
  console.log('Creating ranking lists and items...');

  // === シナリオ1: 人気テーマ (Total/Average Rankテスト用) ===
  const popularSubject = 'おすすめ作業用BGM';
  // User A (公開, 最近更新)
  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userA.id, status: ListStatus.PUBLISHED,
      description: "集中できるBGM集めました",
      updatedAt: faker.date.recent({ days: 2 }), // 直近2日以内
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 3 }) }), // createdAt <= updatedAt
      items: { create: createItemsData(['Lo-fi Hip Hop Radio', 'ヒーリングミュージック', 'ゲームサウンドトラック']) }
    }
  });
  // User B (公開, 最近更新)
  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userB.id, status: ListStatus.PUBLISHED,
      description: "私のベスト３",
      updatedAt: faker.date.recent({ days: 4 }), // 直近4日以内
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 5 }) }),
      items: { create: createItemsData(['ヒーリングミュージック', 'Lo-fi Hip Hop Radio', 'カフェミュージック']) } // 順位と一部アイテムが違う
    }
  });
   // User C (公開, 少し古い更新)
   await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userC.id, status: ListStatus.PUBLISHED,
      updatedAt: faker.date.recent({ days: 10 }), // 10日前 (週間トレンドからは外れるかも)
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 11 }) }),
      items: { create: createItemsData(['ゲームサウンドトラック', 'Lo-fi Hip Hop Radio', '自然の音']) }
    }
  });
   // User A (下書き, 最近更新) - 集計には含まれないはず
   await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userA.id, status: ListStatus.DRAFT,
      updatedAt: faker.date.recent({ days: 1 }),
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 2 }) }),
      items: { create: createItemsData(['考え中アイテム1', '考え中アイテム2']) }
    }
  });

  // === シナリオ2: 別の感情での同名テーマ ===
  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.DISLIKE, // 感情を DISLIKE に
      subject: popularSubject, // テーマ名は同じ
      authorId: userA.id, status: ListStatus.PUBLISHED,
      description: "これは苦手...",
      updatedAt: faker.date.recent({ days: 3 }),
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 4 }) }),
      items: { create: createItemsData(['うるさいBGM', '単調なBGM']) }
    }
  });

  // === シナリオ3: ニッチなテーマ (Totalテスト用) ===
  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.DISLIKE, subject: '会議で使われがちなカタカナ語', authorId: userC.id, status: ListStatus.PUBLISHED,
      updatedAt: faker.date.past({ years: 1 }), createdAt: faker.date.past({ years: 1 }),
      items: { create: createItemsData(['アジェンダ', 'エビデンス', 'バジェット']) }
    }
  });

  // === シナリオ4: 週間トレンドテスト用テーマ ===
  const weeklySubject = '今週読んだ本';
  // User B (公開, 今週更新)
  await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE, subject: weeklySubject, authorId: userB.id, status: ListStatus.PUBLISHED,
      updatedAt: faker.date.recent({ days: 1 }), // ★ 直近1日以内
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 2 }) }),
      items: { create: createItemsData(['小説A', '技術書B']) }
    }
  });
   // User C (公開, 今週更新)
   await prisma.rankingList.create({
    data: {
      sentiment: Sentiment.LIKE, subject: weeklySubject, authorId: userC.id, status: ListStatus.PUBLISHED,
      updatedAt: faker.date.recent({ days: 3 }), // ★ 直近3日以内
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 4 }) }),
      items: { create: createItemsData(['技術書B', '自己啓発本C']) }
    }
  });

  // === シナリオ5: 他のランダムな公開リスト ===
   for (let i = 0; i < 10; i++) { // 少し多めに追加
      const user = faker.helpers.arrayElement([userA, userB, userC]);
      const sentiment = faker.helpers.arrayElement([Sentiment.LIKE, Sentiment.DISLIKE]);
      const subject = faker.lorem.words({min: 3, max: 6});
      const createdAt = faker.date.past({ years: 1 });
      const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
      await prisma.rankingList.create({
        data: { sentiment, subject, authorId: user.id, status: ListStatus.PUBLISHED, createdAt, updatedAt,
          items: { create: createItemsData(Array.from({ length: faker.number.int({ min: 2, max: 7 }) }, (_, k) => faker.commerce.productName() + `_${k}` )) }
        }
      });
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