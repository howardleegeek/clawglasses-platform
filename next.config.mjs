import bundleAnalyzer from "@next/bundle-analyzer";

// Bundle analyzer is gated on ANALYZE=true so it stays inert on every regular
// `next build` (Vercel, CI, local). Run `npm run analyze` to produce reports
// at .next/analyze/{client,edge,nodejs}.html.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
