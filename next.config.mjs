/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'k.kakaocdn.net' },
    ],
  },
  // Next.js 14: Prisma 등 서버 전용 패키지 외부화
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

export default nextConfig
