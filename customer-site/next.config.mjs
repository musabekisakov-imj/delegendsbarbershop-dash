/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Allow service photos / staff avatars uploaded as data URLs OR served
      // from the backend. Keep this open until uploads land on a CDN.
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
