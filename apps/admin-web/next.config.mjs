/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@attendance/types", "@attendance/validation", "@attendance/shared-utils"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  },
  experimental: {
    webpackBuildWorker: false
  }
};

export default nextConfig;
