import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep PDF + DOCX parsers as external CJS at runtime — they ship Node-only
  // bindings (canvas, fs streams, etc.) that don't play well with the
  // bundler. Bundling them in causes obscure runtime errors on Vercel.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
};

export default nextConfig;
