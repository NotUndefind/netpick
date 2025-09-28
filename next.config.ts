import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "image.tmdb.org",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "cdn.movieofthenight.com",
				port: "",
				pathname: "/**",
			},
		],
		formats: ["image/webp", "image/avif"],
		minimumCacheTTL: 300,
	},
	compress: true,
	poweredByHeader: false,
	reactStrictMode: true,
	experimental: {
		optimizePackageImports: ["@heroicons/react"],
	},
};

export default nextConfig;
