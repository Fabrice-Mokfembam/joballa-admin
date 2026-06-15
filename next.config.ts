import type { NextConfig } from "next";

function apiRemotePattern() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    return { protocol, hostname: url.hostname };
  } catch {
    return null;
  }
}

const apiPattern = apiRemotePattern();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(apiPattern ? [apiPattern] : []),
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
