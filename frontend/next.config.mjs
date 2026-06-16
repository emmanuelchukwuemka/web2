/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:3001";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/ws",         destination: `${backend}/ws`         },
    ];
  },
};

export default nextConfig;