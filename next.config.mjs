/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'hapax';

const nextConfig = {
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL,
  },

  output: 'export',
  trailingSlash: true,

  images: {
    unoptimized: true,
  },

  basePath: isGithubActions ? `/${repoName}` : '',
  assetPrefix: isGithubActions ? `/${repoName}/` : '',
};

export default nextConfig;