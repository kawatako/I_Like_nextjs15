/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // React Strict Mode (推奨)

  // --- ↓↓↓ images 設定を追加または修正 ↓↓↓ ---
  images: {
    // remotePatterns を使うのが推奨される方法です
    remotePatterns: [
      {
        protocol: "https", // プロトコル (http or https)
        hostname: "gvhbqlaaqlprgvthcxic.supabase.co", // ★ 許可するホスト名
       // port: "", // ポート番号 (通常は空)
       // pathname: "/**", // ホスト名以下の任意のパスを許可
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com', // Clerk の画像用ホスト名
      },
    ],
  },
};

export default nextConfig;
