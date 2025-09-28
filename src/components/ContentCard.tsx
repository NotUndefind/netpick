"use client";
import { motion } from "motion/react";
import Image from "next/image";
import {
	ArrowTopRightOnSquareIcon,
	StarIcon,
	CalendarIcon,
	ClockIcon,
} from "@heroicons/react/24/outline";

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

interface ContentCardProps {
	show: Show;
	country: string;
	onNewPick?: () => void;
}

export default function ContentCard({
	show,
	country,
	onNewPick,
}: ContentCardProps) {
	const year = show.releaseYear || show.firstAirYear;
	const duration =
		show.showType === "movie"
			? `${show.runtime}min`
			: show.seasonCount
			? `${show.seasonCount} season${show.seasonCount > 1 ? "s" : ""}`
			: "";

	const handleWatchOnNetflix = () => {
		if (show.netflixLink) {
			window.open(show.netflixLink, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<motion.div
			className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
			initial={{ opacity: 0, y: 50, scale: 0.9 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{
				type: "spring",
				stiffness: 260,
				damping: 20,
				duration: 0.6,
			}}
		>
			<div className="lg:flex">
				{/* Poster Section */}
				<motion.div
					className="relative h-96 lg:h-auto lg:w-1/3"
					initial={{ opacity: 0, x: -50 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.2, duration: 0.6 }}
				>
					<Image
						src={show.images.poster}
						alt={`${show.title} poster`}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 100vw, 33vw"
						priority
					/>

					{/* Rating Badge */}
					<motion.div
						className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm"
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.5 }}
					>
						<StarIcon className="h-4 w-4 text-yellow-400" />
						<span>{(show.rating / 10).toFixed(1)}</span>
					</motion.div>

					{/* Show Type Badge */}
					<motion.div
						className="absolute top-4 left-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white"
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.4 }}
					>
						{show.showType}
					</motion.div>
				</motion.div>

				{/* Content Section */}
				<motion.div
					className="flex-1 p-8"
					initial={{ opacity: 0, x: 50 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.3, duration: 0.6 }}
				>
					{/* Title and Year */}
					<motion.div
						className="mb-4"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
							{show.title}
						</h1>
						{show.originalTitle !== show.title && (
							<p className="text-lg text-gray-600 dark:text-gray-400">
								{show.originalTitle}
							</p>
						)}
					</motion.div>

					{/* Metadata */}
					<motion.div
						className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
					>
						{year && (
							<div className="flex items-center gap-1">
								<CalendarIcon className="h-4 w-4" />
								<span>{year}</span>
							</div>
						)}
						{duration && (
							<div className="flex items-center gap-1">
								<ClockIcon className="h-4 w-4" />
								<span>{duration}</span>
							</div>
						)}
						<div className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-gray-800">
							{country.toUpperCase()}
						</div>
					</motion.div>

					{/* Genres */}
					<motion.div
						className="mb-6"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 }}
					>
						<div className="flex flex-wrap gap-2">
							{show.genres.slice(0, 4).map((genre, index) => (
								<motion.span
									key={genre.id}
									className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/20 dark:text-red-400"
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: 0.7 + index * 0.1 }}
								>
									{genre.name}
								</motion.span>
							))}
						</div>
					</motion.div>

					{/* Overview */}
					<motion.div
						className="mb-6"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.8 }}
					>
						<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
							{show.overview}
						</p>
					</motion.div>

					{/* Cast */}
					{show.cast && show.cast.length > 0 && (
						<motion.div
							className="mb-8"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.9 }}
						>
							<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
								Cast
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{show.cast.slice(0, 5).join(", ")}
								{show.cast.length > 5 && "..."}
							</p>
						</motion.div>
					)}

					{/* Action Buttons */}
					<motion.div
						className="flex flex-col gap-3 sm:flex-row"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1.0 }}
					>
						{/* Watch on Netflix Button */}
						<motion.button
							onClick={handleWatchOnNetflix}
							disabled={!show.netflixLink}
							className={`
                flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all
                ${
					show.netflixLink
						? "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg"
						: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
				}
              `}
							whileHover={show.netflixLink ? { scale: 1.02 } : {}}
							whileTap={show.netflixLink ? { scale: 0.98 } : {}}
						>
							<ArrowTopRightOnSquareIcon className="h-5 w-5" />
							Watch on Netflix
						</motion.button>

						{/* Try Another Button */}
						<motion.button
							onClick={onNewPick}
							className="rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							Try Another
						</motion.button>
					</motion.div>
				</motion.div>
			</div>
		</motion.div>
	);
}
