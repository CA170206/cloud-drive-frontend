/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://cloud-drive-internship.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
