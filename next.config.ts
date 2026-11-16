import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: true,
  // No org/project configured for this free-tier deployment — omitting
  // these just skips the build-time source-map-upload step (which needs a
  // Sentry auth token), error capture itself is unaffected.
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
});
