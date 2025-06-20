/*
<ai_context>
Configures Next.js for the app.
</ai_context>
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure which external domains / subdomains <Image> is allowed to fetch from.
  // Use `NEXT_PUBLIC_IMAGE_DOMAINS` (comma-separated) to avoid hard-coding hosts.
  // Example:  NEXT_PUBLIC_IMAGE_DOMAINS="images.clerk.dev,lh3.googleusercontent.com,supabase-project-id.supabase.co"
  // Localhost is always allowed for storybook / dev screenshots.
  images: {
    domains:
      process.env.NEXT_PUBLIC_IMAGE_DOMAINS?.split(",").map(d => d.trim()).filter(Boolean) || [],
    remotePatterns: [{ hostname: "localhost" }]
  },
  // Enforce additional runtime safety checks and faster builds in development & prod
  reactStrictMode: true,
  // SWC minifier is the default in Next.js 15+, no need for explicit flag
  experimental: {
    // Keeping workerThreads disabled because it causes a DataCloneError in v15.1
    workerThreads: false
  }
}

export default nextConfig
