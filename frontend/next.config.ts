import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  allowedDevOrigins: [
    "http://localhost:4300",
    "http://10.3.6.62:4300"
  ],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4100",
        pathname: "/tracks/**"
      },
      {
        protocol: "http",
        hostname: "10.3.7.57",
        port: "3000",
        pathname: "/music/**"
      }
    ]
  }
};

export default nextConfig;
