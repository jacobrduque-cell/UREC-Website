import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Course cover images are served from the public content-images
    // bucket on Supabase storage.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  experimental: {
    serverActions: {
      // File submissions and course-file uploads go through server
      // actions. The default 1 MB body cap silently failed any real
      // upload (a PDF deck, an XLSX model) with a generic error page.
      // Match the submissions storage bucket's 25 MB limit.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
