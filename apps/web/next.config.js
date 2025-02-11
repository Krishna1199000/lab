/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ["@repo/db"], 
  experimental: {
    externalDir: true // This allows importing from outside the app directory
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
      },
      {
        protocol: "https",
        hostname: "project-demo-thing.s3.ap-south-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "project-demo-thing.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      }
    ],
  },
};

export default nextConfig;
