/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase の署名付き URL だけを許可
      {
        protocol: "https",
        hostname: "gvhbqlaaqlprgvthcxic.supabase.co",
        port: "",
        pathname: "/storage/v1/object/sign/**",
      },
      // Clerk のアバターなど
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
        pathname: "/**",
      },
      // ドメイン直ホストされた画像（例: ドメイン直URLも使うなら）
      {
        protocol: "https",
        hostname: "www.topme.jp",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
