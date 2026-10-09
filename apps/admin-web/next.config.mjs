const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/events", destination: "/admin/events", permanent: false },
      { source: "/events/:path*", destination: "/admin/events/:path*", permanent: false },
      { source: "/attendance/live", destination: "/admin/live-attendance", permanent: false },
      { source: "/attendance/review", destination: "/admin/review-queue", permanent: false },
      { source: "/students", destination: "/admin/students", permanent: false },
      { source: "/announcements", destination: "/admin/announcements", permanent: false },
      { source: "/reports", destination: "/admin/reports", permanent: false },
      { source: "/profile", destination: "/admin/profile", permanent: false }
    ];
  },
  transpilePackages: ["@attendance/types", "@attendance/validation", "@attendance/shared-utils", "@attendance/api-client"],
  experimental: {
    useTypeScriptCli: false
  },
  images: {
    remotePatterns: supabaseHostname ? [
      {
        protocol: "https",
        hostname: supabaseHostname
      }
    ] : []
  }
};

export default nextConfig;
