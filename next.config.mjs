/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@prisma/adapter-libsql', 
    '@libsql/client',
    'tailwindcss',
    'postcss',
    'autoprefixer'
  ],
};

export default nextConfig;