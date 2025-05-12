//app/healthcheck/route.ts
//通信環境テスト

export async function GET() {
  console.log("▶︎ SUPABASE_DB_URL:", process.env.SUPABASE_DB_URL);
  return new Response("ok");
}
