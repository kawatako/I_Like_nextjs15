//app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
// Prisma エラーを型チェックするためにインポート
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  console.log("Received a webhook request...");

  // Webhookシークレットを環境変数から取得
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("WEBHOOK_SECRET is not set in environment variables.");
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // ヘッダーを取得
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Svixヘッダーが不足しているかチェック
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.warn("Webhook request missing Svix headers.");
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // リクエストボディを取得して文字列化 (Svix検証用) & JSON保持
  let payload: any; // Clerk の Payload 型を使うのが望ましい
  let body: string;
  try {
    payload = await req.json();
    body = JSON.stringify(payload);
    console.log("Webhook payload received and parsed.");
  } catch (err) {
    console.error("Error parsing webhook request body:", err);
    return new Response("Invalid request body", { status: 400 });
  }

  // Svix インスタンスを作成して署名を検証
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    // data.id が存在するか確認 (特に delete イベント)
    const eventUserId = evt.data.id;
    if (!eventUserId && evt.type !== "user.deleted") {
      // deleteの場合、後でチェック
      console.warn(`User ID missing in event payload for type: ${evt.type}`);
      // IDがないと処理できないのでエラーを返す
      return new Response(`User ID missing in ${evt.type} event.`, {
        status: 400,
      });
    }
    console.log(
      `Webhook verified. Event type: ${evt.type}, Clerk User ID: ${
        eventUserId || "N/A (deleted event might miss id sometimes?)"
      }`
    );
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured during verification", {
      status: 400,
    });
  }

  // イベントタイプに基づいて処理を分岐
  const eventType = evt.type;
  // イベントから Clerk ユーザー ID を取得
  // 注意: delete イベントの場合、evt.data.id が存在しないケースも Clerk のドキュメントによっては示唆されているため、各ブロックで再度確認・使用する
  const clerkUserId = evt.data.id;

  // --- User Created イベント (Upsertを使用) ---
  if (eventType === "user.created") {
    if (!clerkUserId) {
      console.error("Clerk User ID is missing in user.created event.");
      return new Response("User ID missing in create event.", { status: 400 });
    }
    try {
      console.log(`Processing user.created event for Clerk ID: ${clerkUserId}`);
      const username = payload.data.username;
      const imageUrl = payload.data.image_url;

      if (!username) {
        console.warn(
          `Username is missing in user.created payload for ${clerkUserId}`
        );
      }

      await prisma.user.upsert({
        where: {
          // スキーマに基づき、一意な clerkId フィールドで検索
          clerkId: clerkUserId,
        },
        update: {
          // ユーザーが既に存在した場合に更新するデータ
          username: username, // username も更新対象にするかは要検討
          image: imageUrl,
          updatedAt: new Date(), // @updatedAt があるが明示的に更新も可
        },
        create: {
          // ユーザーが存在しない場合に新規作成するデータ
          clerkId: clerkUserId, // clerkId を設定
          username: username, // username を設定 (uniqueなので注意)
          image: imageUrl,
          // 注意: 'id' は Prisma が自動生成するので、ここでは指定しない
        },
      });
      console.log(`Successfully upserted user ${clerkUserId}`);
      return new Response("User has been created or updated!", { status: 200 });
    } catch (err) {
      console.error(`Error processing user.created for ${clerkUserId}:`, err);
      // P2002 (Unique constraint failed) が username で発生した場合のログを出すとより分かりやすい
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        err.meta?.target &&
        Array.isArray(err.meta.target) &&
        err.meta.target.includes("username")
      ) {
        console.error(
          `Failed to create user ${clerkUserId}: Username '${payload.data.username}' already exists.`
        );
      }
      return new Response("Failed to process user creation/update!", {
        status: 500,
      });
    }
  }

  // --- User Updated イベント ---
  if (eventType === "user.updated") {
    if (!clerkUserId) {
      console.error("Clerk User ID is missing in user.updated event.");
      return new Response("User ID missing in update event.", { status: 400 });
    }
    try {
      console.log(`Processing user.updated event for Clerk ID: ${clerkUserId}`);
      const username = payload.data.username;
      const imageUrl = payload.data.image_url;

      await prisma.user.update({
        where: {
          // スキーマに基づき、一意な clerkId フィールドで検索
          clerkId: clerkUserId,
        },
        data: {
          // 更新するデータ
          username: username,
          image: imageUrl,
          // updatedAt は @updatedAt により自動更新されるはず
        },
      });
      console.log(`Successfully updated user ${clerkUserId}`);
      return new Response("User has been updated!", { status: 200 });
    } catch (err) {
      console.error(`Error processing user.updated for ${clerkUserId}:`, err);
      // 更新対象が見つからない(P2025)場合の処理
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        console.warn(`User ${clerkUserId} not found for update.`);
        return new Response("User not found for update.", { status: 404 }); // 404 Not Found
      }
      // username の unique 制約違反 (P2002) が update 時に発生する可能性も考慮
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.meta?.target &&
        Array.isArray(err.meta.target) &&
        err.meta.target.includes("username")
      ) {
        console.error(
          `Failed to update user ${clerkUserId}: Username '${payload.data.username}' already exists for another user.`
        );
        return new Response("Username already exists.", { status: 409 }); // 409 Conflict など
      }
      return new Response("Failed to update the user!", { status: 500 });
    }
  }

  // --- User Deleted イベント ---
  if (eventType === "user.deleted") {
    // 削除イベントでは evt.data に削除されたユーザーの情報が含まれるが、IDが null の場合もある
    const deletedClerkUserId = evt.data.id;

    // ID が取得できない場合は処理できない（ログは残す）
    if (!deletedClerkUserId) {
      console.warn(
        "User ID missing in user.deleted event payload. Cannot delete user from DB."
      );
      // 成功扱いにするか、エラーにするかは要件次第 (ここでは成功扱いに)
      return new Response(
        "User ID missing in delete event, but acknowledged.",
        { status: 200 }
      );
    }

    try {
      console.log(
        `Processing user.deleted event for Clerk ID: ${deletedClerkUserId}`
      );
      await prisma.user.delete({
        where: {
          // スキーマに基づき、一意な clerkId フィールドで検索
          clerkId: deletedClerkUserId,
        },
      });
      console.log(`Successfully deleted user ${deletedClerkUserId}`);
      return new Response("User has been deleted!", { status: 200 });
    } catch (err) {
      console.error(
        `Error processing user.deleted for ${deletedClerkUserId}:`,
        err
      );
      // P2025エラー (削除対象が見つからない) の場合は、既に削除されているとみなし 200 OK
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        console.log(
          `User ${deletedClerkUserId} not found for deletion, assumed already deleted.`
        );
        return new Response("User not found, assumed already deleted.", {
          status: 200,
        });
      }
      // その他の予期せぬデータベースエラー (例: 外部キー制約で削除できない P2003 など)
      return new Response("Failed to delete the user!", { status: 500 });
    }
  }

  // --- 上記以外のイベントタイプの場合 ---
  console.log(
    `Received webhook event type "${eventType}", but no specific action is configured.`
  );
  return new Response(
    `Webhook received (type: ${eventType}), but no specific action taken.`,
    { status: 200 }
  );
}
