/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // React Strict Mode (推奨)

  // --- ↓↓↓ images 設定を追加または修正 ↓↓↓ ---
  images: {
    // remotePatterns を使うのが推奨される方法です
    remotePatterns: [
      {
        protocol: "https", // プロトコル (http or https)
        hostname: "picsum.photos", // ★ 許可するホスト名
        port: "", // ポート番号 (通常は空)
        pathname: "/**", // ホスト名以下の任意のパスを許可
      },
    ],
  },
};

export default nextConfig;
