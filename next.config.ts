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
	},
};

export default nextConfig;
