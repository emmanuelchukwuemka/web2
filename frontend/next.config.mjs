/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    const raw = process.env.BACKEND_URL ?? "http://localhost:3001";
    const backend = raw.startsWith("http") ? raw : `https://${raw}`;
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/ws",         destination: `${backend}/ws`         },
    ];
  },
  webpack(config) {
    // Suppress missing optional native modules from MetaMask SDK and WalletConnect
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "lokijs": false,
      "encoding": false,
    };
    return config;
  },
};

export default nextConfig;