"use client";
import { useState } from "react";
import { motion } from "motion/react";

interface DiscoverButtonProps {
	onDiscover: () => Promise<void>;
	isLoading: boolean;
	disabled?: boolean;
}

export default function DiscoverButton({
	onDiscover,
	isLoading,
	disabled,
}: DiscoverButtonProps) {
	const [isPressed, setIsPressed] = useState(false);

	const handleClick = async () => {
		if (isLoading || disabled) return;

		setIsPressed(true);
		try {
			await onDiscover();
		} finally {
			// Keep pressed state for a moment for better UX
			setTimeout(() => setIsPressed(false), 200);
		}
	};

	return (
		<div className="flex flex-col items-center gap-4">
			{/* Main Discover Button */}
			<motion.button
				onClick={handleClick}
				disabled={isLoading || disabled}
				className={`
          relative overflow-hidden rounded-full bg-gradient-to-r from-red-600 to-red-700
          px-12 py-6 text-xl font-bold text-white shadow-lg transition-all duration-200
          hover:from-red-700 hover:to-red-800 hover:shadow-xl
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isPressed ? "scale-95" : "hover:scale-105"}
        `}
				whileHover={{ scale: disabled ? 1 : 1.05 }}
				whileTap={{ scale: disabled ? 1 : 0.95 }}
				animate={{
					scale: isPressed ? 0.95 : 1,
				}}
				transition={{ type: "spring", stiffness: 400, damping: 17 }}
			>
				{/* Button Content */}
				<motion.div
					className="flex items-center justify-center gap-3"
					animate={{
						opacity: isLoading ? 0.7 : 1,
					}}
				>
					{isLoading ? (
						<>
							{/* Loading Spinner */}
							<motion.div
								className="h-6 w-6 rounded-full border-2 border-white border-t-transparent"
								animate={{ rotate: 360 }}
								transition={{
									duration: 1,
									repeat: Infinity,
									ease: "linear",
								}}
							/>
							<span>Discovering...</span>
						</>
					) : (
						<>
							{/* Netflix-style Play Icon */}
							<motion.div
								className="flex items-center"
								whileHover={{ x: 2 }}
								transition={{
									type: "spring",
									stiffness: 400,
									damping: 17,
								}}
							>
								<svg
									className="h-6 w-6"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M8 5v14l11-7z" />
								</svg>
							</motion.div>
							<span>Discover</span>
						</>
					)}
				</motion.div>

				{/* Ripple Effect on Click */}
				{isPressed && (
					<motion.div
						className="absolute inset-0 bg-white/20 rounded-full"
						initial={{ scale: 0, opacity: 0.6 }}
						animate={{ scale: 4, opacity: 0 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
					/>
				)}
			</motion.button>

			{/* Subtitle */}
			<motion.p
				className="text-center text-gray-600 dark:text-gray-400 max-w-md"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
			>
				Click to discover your next Netflix watch instantly
			</motion.p>

			{/* Quick Stats */}
			<motion.div
				className="flex items-center gap-4 text-sm text-gray-500"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.4 }}
			>
				<div className="flex items-center gap-1">
					<div className="h-2 w-2 rounded-full bg-green-500"></div>
					<span>Instant results</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="h-2 w-2 rounded-full bg-red-500"></div>
					<span>Netflix exclusive</span>
				</div>
			</motion.div>
		</div>
	);
}
