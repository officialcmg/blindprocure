import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/encrypt-bid",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          // Cross-origin isolation (window.crossOriginIsolated) requires COOP + COEP
          // *and* that Permissions-Policy doesn't block it. The default allowlist for
          // cross-origin-isolated is "self", but some browsers are stricter about
          // inheriting it on a popup than others - set it explicitly so this doesn't
          // silently fail in browsers with tighter defaults.
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/cross-origin-isolated
          {
            key: "Permissions-Policy",
            value: "cross-origin-isolated=(self)",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
