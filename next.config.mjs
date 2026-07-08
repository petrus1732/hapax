/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL,
  },
  outputFileTracing: true,
  experimental: {
    outputFileTracingIncludes: {
      '/dictionary': ['./app/lib/dictionary.json'],
    },
  },
};

export default nextConfig;