// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Node.js／サーバーのタイムゾーンを日本時間に
    TZ: "Asia/Tokyo",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gvhbqlaaqlprgvthcxic.supabase.co",
        port: "",
        // サイン付き URL
        pathname: "/storage/v1/object/sign/**",
      },
      {
        protocol: "https",
        hostname: "gvhbqlaaqlprgvthcxic.supabase.co",
        port: "",
        // 公開バケット用 URL
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.topme.jp",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
