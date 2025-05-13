/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react'], // Attempt to fix lucide-react build issues
  // Add rewrites for local development proxy to backend
  async rewrites() {
    // Determine the backend URL - use environment variable or default to Render URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log(`[Next.js Config] Setting up rewrite proxy. Target backend: ${backendUrl}`);

    // Ensure the destination URL doesn't end with /api if the source already includes it
    const destinationBase = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`;

    return [
      {
        source: '/api/:path*', // Proxy requests starting with /api/
        // Ensure the destination correctly maps the path
        // Ensure the destination includes the /api prefix correctly
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
};

module.exports = nextConfig;
