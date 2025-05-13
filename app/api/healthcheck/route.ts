//app/healthcheck/route.ts
//通信環境テスト

export async function GET() {
  console.log("▶︎ DATABASE_URL:", process.env.DATABASE_URL);
  return new Response("ok");
}
