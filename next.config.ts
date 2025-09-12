import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // Domínio das miniaturas do YouTube
        port: '',
        pathname: '/vi/**',
      },
    ],
  },
};

export default nextConfig;




