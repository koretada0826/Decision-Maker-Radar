/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // lucide-react は通常 import で全アイコンが bundle に入る恐れがあるため最適化
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
