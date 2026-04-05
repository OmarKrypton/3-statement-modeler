import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a fully static export (HTML/CSS/JS, no Node.js runtime required).
  // The output lands in the `out/` directory after `next build`.
  output: "export",

  // Needed for correct asset resolution when served from the root of FastAPI.
  trailingSlash: true,

  // Disable Next.js built-in image optimization — it requires a running server.
  // If you use <Image>, it will fall back to a plain <img>.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

