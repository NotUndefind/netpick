"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import DiscoverButton from "@/components/DiscoverButton";
import ContentCard from "@/components/ContentCard";
import CountrySelector from "@/components/CountrySelector";
import TypeSelector from "@/components/TypeSelector";

type ContentType = "any" | "movie" | "series";

interface Show {
	id: string;
	title: string;
	originalTitle: string;
	overview: string;
	showType: "movie" | "series";
	releaseYear?: number;
	firstAirYear?: number;
	lastAirYear?: number;
	rating: number;
	genres: Array<{ id: string; name: string }>;
	runtime?: number;
	seasonCount?: number;
	episodeCount?: number;
	cast: string[];
	directors?: string[];
	creators?: string[];
	images: {
		poster: string;
		backdrop: string;
	};
	netflixLink?: string;
}

export default function Home() {
	const [isLoading, setIsLoading] = useState(false);
	const [currentShow, setCurrentShow] = useState<Show | null>(null);
	const [selectedCountry, setSelectedCountry] = useState<string>("us");
	const [selectedType, setSelectedType] = useState<ContentType>("any");
	const [error, setError] = useState<string | null>(null);

	const handleDiscover = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			// Build query parameters
			const params = new URLSearchParams({
				country: selectedCountry,
				type: selectedType,
				userId: "demo-user", // In real app, this would be user's session ID
			});

			const response = await fetch(`/api/discover?${params.toString()}`);
			const data = await response.json();

			// No more cache loading - direct API calls

			if (!response.ok) {
				throw new Error(data.message || data.error || "Failed to discover content");
			}

			if (data.success && data.data.show) {
				setCurrentShow(data.data.show);
			} else {
				throw new Error("No content found");
			}
		} catch (err) {
			console.error("Discover error:", err);
			setError(
				err instanceof Error ? err.message : "Something went wrong"
			);
		} finally {
			setIsLoading(false);
		}
	}, [selectedCountry, selectedType]);

	const handleNewPick = useCallback(() => {
		handleDiscover();
	}, [handleDiscover]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			{/* Header */}
			<motion.header
				className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white"
				initial={{ opacity: 0, y: -50 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
			>
				<div className="relative z-10 mx-auto max-w-4xl px-6 py-12 text-center">
					<motion.h1
						className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2, duration: 0.6 }}
					>
						NetPick
					</motion.h1>
					<motion.p
						className="text-xl text-red-100 sm:text-2xl"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4, duration: 0.6 }}
					>
						Discover your next Netflix obsession instantly
					</motion.p>
				</div>

				{/* Background Pattern */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] bg-repeat"></div>
				</div>
			</motion.header>

			{/* Main Content */}
			<main className="mx-auto max-w-4xl px-6 py-12">
				{/* Controls */}
				<motion.div
					className="mb-12 space-y-8"
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6, duration: 0.6 }}
				>
					{/* Country and Type Selectors */}
					<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-center">
						<div className="flex-1 max-w-xs">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Netflix Region
							</label>
							<CountrySelector
								selectedCountry={selectedCountry}
								onCountryChange={setSelectedCountry}
								disabled={isLoading}
							/>
						</div>
					</div>

					{/* Type Selector */}
					<TypeSelector
						selectedType={selectedType}
						onTypeChange={setSelectedType}
						disabled={isLoading}
					/>

					{/* Discover Button */}
					<div className="flex justify-center pt-4">
						<DiscoverButton
							onDiscover={handleDiscover}
							isLoading={isLoading}
							disabled={false}
						/>
					</div>
				</motion.div>

				{/* Error Message */}
				<AnimatePresence>
					{error && (
						<motion.div
							className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{
								type: "spring",
								stiffness: 400,
								damping: 25,
							}}
						>
							<p className="font-medium">Oops! {error}</p>
							<button
								onClick={handleDiscover}
								className="mt-2 text-sm underline hover:no-underline"
							>
								Try again
							</button>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Content Card */}
				<AnimatePresence mode="wait">
					{currentShow && !error && (
						<motion.div
							key={currentShow.id}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3 }}
						>
							<ContentCard
								show={currentShow}
								country={selectedCountry}
								onNewPick={handleNewPick}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Welcome Message */}
				{!currentShow && !isLoading && !error && (
					<motion.div
						className="text-center"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1, duration: 0.6 }}
					>
						<div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-900">
							<div className="mb-4 text-6xl">🎬</div>
							<h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
								Ready to discover?
							</h2>
							<p className="text-gray-600 dark:text-gray-400">
								Click the Discover button above to find your
								next Netflix binge-watch!
							</p>
						</div>
					</motion.div>
				)}
			</main>

			{/* Footer */}
			<motion.footer
				className="mt-16 border-t border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-900"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1.2, duration: 0.6 }}
			>
				<div className="mx-auto max-w-4xl px-6 text-center">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						NetPick - Powered by Netflix data • Made with ❤️ for
						movie lovers
					</p>
				</div>
			</motion.footer>
		</div>
	);
}
