"use client";
import { motion } from "motion/react";
import { FilmIcon, TvIcon, SparklesIcon } from "@heroicons/react/24/outline";

type ContentType = "any" | "movie" | "series";

interface TypeSelectorProps {
	selectedType: ContentType;
	onTypeChange: (type: ContentType) => void;
	disabled?: boolean;
}

const contentTypes = [
	{
		id: "any" as ContentType,
		label: "Surprise Me",
		icon: SparklesIcon,
		description: "Movies & Series",
		color: "from-purple-500 to-pink-500",
	},
	{
		id: "movie" as ContentType,
		label: "Movies",
		icon: FilmIcon,
		description: "Films only",
		color: "from-blue-500 to-cyan-500",
	},
	{
		id: "series" as ContentType,
		label: "Series",
		icon: TvIcon,
		description: "TV Shows only",
		color: "from-green-500 to-emerald-500",
	},
];

export default function TypeSelector({
	selectedType,
	onTypeChange,
	disabled = false,
}: TypeSelectorProps) {
	return (
		<div className="space-y-3">
			<h3 className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
				What do you want to discover?
			</h3>

			<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
				{contentTypes.map((type) => {
					const isSelected = selectedType === type.id;
					const Icon = type.icon;

					return (
						<motion.button
							key={type.id}
							onClick={() => !disabled && onTypeChange(type.id)}
							disabled={disabled}
							className={`
                relative flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all
                ${
					isSelected
						? "border-transparent bg-gradient-to-r text-white shadow-lg " +
						  type.color
						: disabled
						? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800"
						: "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-md dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500"
				}
              `}
							whileHover={
								!disabled && !isSelected
									? { scale: 1.02, y: -2 }
									: {}
							}
							whileTap={!disabled ? { scale: 0.98 } : {}}
							animate={{
								scale: isSelected ? 1.02 : 1,
							}}
							transition={{
								type: "spring",
								stiffness: 400,
								damping: 25,
							}}
						>
							{/* Background Gradient Overlay */}
							{isSelected && (
								<motion.div
									className={`absolute inset-0 rounded-xl bg-gradient-to-r opacity-10 ${type.color}`}
									initial={{ opacity: 0 }}
									animate={{ opacity: 0.1 }}
									transition={{ duration: 0.3 }}
								/>
							)}

							{/* Icon */}
							<motion.div
								className={`
                  flex h-10 w-10 items-center justify-center rounded-lg
                  ${isSelected ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800"}
                `}
								animate={{
									rotate: isSelected ? 360 : 0,
								}}
								transition={{ duration: 0.5, type: "spring" }}
							>
								<Icon className="h-5 w-5" />
							</motion.div>

							{/* Content */}
							<div className="text-left">
								<div className="font-semibold">
									{type.label}
								</div>
								<div
									className={`text-sm ${
										isSelected
											? "text-white/80"
											: "text-gray-500 dark:text-gray-400"
									}`}
								>
									{type.description}
								</div>
							</div>

							{/* Selection Indicator */}
							{isSelected && (
								<motion.div
									className="ml-auto h-3 w-3 rounded-full bg-white"
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{
										type: "spring",
										stiffness: 500,
										damping: 25,
									}}
								/>
							)}

							{/* Hover Effect */}
							{!isSelected && !disabled && (
								<motion.div
									className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 transition-opacity"
									style={{
										background: `linear-gradient(to right, ${
											type.color.split(" ")[1]
										}, ${type.color.split(" ")[3]})`,
									}}
									whileHover={{ opacity: 0.05 }}
								/>
							)}
						</motion.button>
					);
				})}
			</div>
		</div>
	);
}
