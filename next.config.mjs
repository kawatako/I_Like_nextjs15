// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
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