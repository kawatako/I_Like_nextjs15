// prisma/seed.ts
import { PrismaClient, Sentiment, ListStatus, FollowRequestStatus } from '@prisma/client'; // ★ FollowRequestStatus を追加
import { fakerJA as faker } from '@faker-js/faker'; // 日本語用 Faker

const prisma = new PrismaClient();

// Helper function to create item data easily
function createItemsData(itemNames: string[], descriptions?: string[], imageBaseUrl?: string | null) {
  return itemNames.map((name, index) => ({
    itemName: name,
    rank: index + 1,
    itemDescription: descriptions?.[index] ?? faker.lorem.sentence(faker.number.int({min: 3, max: 7})),
    imageUrl: faker.datatype.boolean(0.6) ? faker.image.urlPicsumPhotos({ width: 128, height: 128 }) : null,
  }));
}

async function main() {
  console.log(`Start seeding ...`);

  // --- 1. 既存データの削除 (リレーションを考慮した順序) ---
  console.log('Deleting existing data...');
  // 依存関係の深いモデルから削除
  await prisma.followRequest.deleteMany(); // ★ FollowRequest を削除
  await prisma.follow.deleteMany();       // ★ Follow を削除
  // await prisma.like.deleteMany();       // 必要ならコメント解除
  // await prisma.reply.deleteMany();      // 必要ならコメント解除
  // await prisma.post.deleteMany();       // 必要ならコメント解除
  await prisma.rankedItem.deleteMany();   // ランキングアイテム
  await prisma.rankingList.deleteMany();  // ランキングリスト
  await prisma.user.deleteMany();         // 最後にユーザー
  console.log('Existing data deleted.');

  // --- 2. ユーザー作成 ---
  console.log('Creating users...');
  const userkawa = await prisma.user.create({
    data: {
      // ↓↓↓ あなたの Clerk User ID に書き換えてください！ ↓↓↓
      clerkId: 'user_2vJBIO0LzcNTHBgdd1ItnBKTYSA', // 例: Clerk ダッシュボードで確認
      // ↓↓↓ あなたの Clerk Username に書き換えてください！ ↓↓↓
      username: 'kawatako', // 例: Clerk で設定したユーザー名
      name: 'ショウタ カワタ', // 表示名（任意）
      image: faker.image.avatarGitHub(),
      bio: 'Next.js と Prisma で SNS 開発中です。よろしくお願いします！',
      isPrivate: false, // 自分は公開アカウントとする
    },
  });
  const userA = await prisma.user.create({
    data: {
      clerkId: 'user_aaaaaaaaaaaaaaaaaaaa', // ダミー Clerk ID (テストでログインしない場合)
      username: 'alice',
      name: 'Alice Apple',
      image: faker.image.avatarGitHub(),
      bio: faker.lorem.paragraph(),
      isPrivate: false, // 公開アカウント
    },
  });
  const userB = await prisma.user.create({
    data: {
      clerkId: 'user_bbbbbbbbbbbbbbbbbbbb', // ダミー Clerk ID
      username: 'bob',
      name: 'Bob Banana',
      image: faker.image.avatarGitHub(),
      bio: faker.lorem.paragraph(),
      isPrivate: false, // 公開アカウント
    },
  });
  const userC = await prisma.user.create({
    data: {
      clerkId: 'user_cccccccccccccccccccc', // ダミー Clerk ID
      username: 'carol',
      name: 'Carol Cherry',
      image: faker.image.avatarGitHub(),
      bio: faker.lorem.paragraph(),
      // ★★★ Carol を非公開アカウントにする ★★★
      isPrivate: true,
    },
  });
  console.log('Users created:', userkawa.id, userA.id, userB.id, userC.id);

  // --- 3. ランキングリストとアイテム作成 ---
  console.log('Creating ranking lists and items...');

  // === シナリオ1: 人気テーマ (Total/Average Rankテスト用) ===
  const popularSubject = 'おすすめ作業用BGM';
  await prisma.rankingList.create({ /* ... (User A, 公開, 最近更新) ... */
    data: { sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userA.id, status: ListStatus.PUBLISHED, description: "集中できるBGM集めました", updatedAt: faker.date.recent({ days: 2 }), createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 3 }) }), items: { create: createItemsData(['Lo-fi Hip Hop Radio', 'ヒーリングミュージック', 'ゲームサウンドトラック']) } }
  });
  await prisma.rankingList.create({ /* ... (User B, 公開, 最近更新) ... */
    data: { sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userB.id, status: ListStatus.PUBLISHED, description: "私のベスト３", updatedAt: faker.date.recent({ days: 4 }), createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 5 }) }), items: { create: createItemsData(['ヒーリングミュージック', 'Lo-fi Hip Hop Radio', 'カフェミュージック']) } }
  });
  await prisma.rankingList.create({ /* ... (User C, 公開, 少し古い更新) ... */
    data: { sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userC.id, status: ListStatus.PUBLISHED, updatedAt: faker.date.recent({ days: 10 }), createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 11 }) }), items: { create: createItemsData(['ゲームサウンドトラック', 'Lo-fi Hip Hop Radio', '自然の音']) } }
  });
  // User A の下書き (集計には含まれない)
  await prisma.rankingList.create({
    data: { sentiment: Sentiment.LIKE, subject: popularSubject, authorId: userA.id, status: ListStatus.DRAFT, updatedAt: faker.date.recent({ days: 1 }), createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 2 }) }), items: { create: createItemsData(['考え中アイテム1', '考え中アイテム2']) } }
  });

  // === シナリオ2: 別の感情での同名テーマ ===
  await prisma.rankingList.create({ /* ... (User A, DISLIKE, 公開, 最近更新) ... */
    data: { sentiment: Sentiment.DISLIKE, subject: popularSubject, authorId: userA.id, status: ListStatus.PUBLISHED, description: "これは苦手...", updatedAt: faker.date.recent({ days: 3 }), createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 4 }) }), items: { create: createItemsData(['うるさいBGM', '単調なBGM']) } }
  });

  // === シナリオ3: ニッチなテーマ ===
  await prisma.rankingList.create({ /* ... (User C, DISLIKE, 公開, 古い更新) ... */
    data: { sentiment: Sentiment.DISLIKE, subject: '会議で使われがちなカタカナ語', authorId: userC.id, status: ListStatus.PUBLISHED, updatedAt: faker.date.past({ years: 1 }), createdAt: faker.date.past({ years: 1 }), items: { create: createItemsData(['アジェンダ', 'エビデンス', 'バジェット']) } }
  });

  // === シナリオ4: 週間トレンドテスト用テーマ ===
  const weeklySubject = '今週読んだ本';
  await prisma.rankingList.create({ /* ... (User B, LIKE, 公開, 今週更新) ... */
    data: { sentiment: Sentiment.LIKE, subject: weeklySubject, authorId: userB.id, status: ListStatus.PUBLISHED, updatedAt: faker.date.recent({ days: 1 }), createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 2 }) }), items: { create: createItemsData(['小説A', '技術書B']) } }
  });
   await prisma.rankingList.create({ /* ... (User C, LIKE, 公開, 今週更新) ... */
    data: { sentiment: Sentiment.LIKE, subject: weeklySubject, authorId: userC.id, status: ListStatus.PUBLISHED, updatedAt: faker.date.recent({ days: 3 }), createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 4 }) }), items: { create: createItemsData(['技術書B', '自己啓発本C']) } }
  });

  // === シナリオ5: 他のランダムな公開リスト ===
   for (let i = 0; i < 10; i++) {
      const user = faker.helpers.arrayElement([userA, userB, userC]);
      const sentiment = faker.helpers.arrayElement([Sentiment.LIKE, Sentiment.DISLIKE]);
      const subject = faker.lorem.words({min: 3, max: 6});
      const createdAt = faker.date.past({ years: 1 });
      // updatedAt は createdAt より後にする
      const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
      await prisma.rankingList.create({
        data: { sentiment, subject, authorId: user.id, status: ListStatus.PUBLISHED, createdAt, updatedAt,
          items: { create: createItemsData(Array.from({ length: faker.number.int({ min: 2, max: 7 }) }, (_, k) => faker.commerce.productName() + `_${k}` )) }
        }
      });
   }

   // === ★ userkawa の下書きリスト (For You タブテスト用) ===
   await prisma.rankingList.create({
     data: {
       sentiment: Sentiment.DISLIKE, subject: "いつか行きたい場所", authorId: userkawa.id, status: ListStatus.DRAFT,
       items: { create: createItemsData(['マチュピチュ', 'ウユニ塩湖', 'オーロラ']) }
     }
   });
  console.log('Ranking lists and items created.');


  // --- 4. フォロー関係を作成 ---
  console.log('Creating follow relationships...');
  try {
    await prisma.follow.createMany({
      data: [
        // userA は userB, userkawa をフォロー
        { followerId: userA.id, followingId: userB.id },
        { followerId: userA.id, followingId: userkawa.id },
        // userB は userA, userkawa をフォロー (A, kawa と相互)
        { followerId: userB.id, followingId: userA.id },
        { followerId: userB.id, followingId: userkawa.id },
        // userC は userB をフォロー (Cは非公開だがフォローはできる)
        { followerId: userC.id, followingId: userB.id },
        // userkawa は userA, userB をフォロー (A, B と相互)
        { followerId: userkawa.id, followingId: userA.id },
        { followerId: userkawa.id, followingId: userB.id },
      ],
      skipDuplicates: true, // 重複エラーを無視
    });
    console.log('Follow relationships created.');
  } catch (error) {
     console.error('Error creating follows:', error)
  }


  // --- 5. フォローリクエストを作成 (非公開の userC 宛) ---
  console.log('Creating follow requests...');
  try {
     // userC が存在する場合のみリクエストを作成
    if (userC) {
       await prisma.followRequest.createMany({
         data: [
           // userA が userC にリクエスト (PENDING)
           { requesterId: userA.id, requestedId: userC.id, status: FollowRequestStatus.PENDING },
           // userkawa が userC にリクエスト (PENDING)
           { requesterId: userkawa.id, requestedId: userC.id, status: FollowRequestStatus.PENDING },
           // userB が userC にリクエストしたが拒否された履歴 (REJECTED)
           // { requesterId: userB.id, requestedId: userC.id, status: FollowRequestStatus.REJECTED },
         ],
         skipDuplicates: true,
       });
       console.log('Follow requests created.');
    } else {
        console.warn('User C not found, skipping follow request creation for them.')
    }
  } catch (error) {
     console.error('Error creating follow requests:', error)
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