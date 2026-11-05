/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/adapter-libsql', 
      '@libsql/client',
      'tailwindcss',
      'postcss',
      'autoprefixer'
    ],
  },
};

export default nextConfig;