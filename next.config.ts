/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.genius.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.rapgenius.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'assets.rapgenius.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'assets.genius.com',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
