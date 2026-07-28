/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

module.exports = nextConfig

