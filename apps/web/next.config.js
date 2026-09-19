/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Rewrites proxy API calls from Next.js to backend services
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:4001/api/v1/:path*",
      },
      {
        source: "/api/agent/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

module.exports = nextConfig;