// NetPick - Simple Random Picker
// Direct API calls for immediate Netflix content discovery

import {
	NetflixShow,
	RandomPickerConfig,
	DiscoverResponse,
	SupportedCountry,
} from "@/lib/types/netflix";
import { streamingAvailabilityService } from "./streamingAvailability";

export interface PickerStats {
	totalPicks: number;
	averageResponseTime: number;
	lastPickTimestamp: number;
}

export class RandomPickerService {
	private recentPicks: Map<string, NetflixShow[]> = new Map(); // Track recent picks per user
	private stats: PickerStats = {
		totalPicks: 0,
		averageResponseTime: 0,
		lastPickTimestamp: 0,
	};

	private readonly maxRecentPicks = 10; // Remember last 10 picks per user

	/**
	 * Main discover method - Returns a random Netflix show via direct API call
	 */
	async discover(
		config: RandomPickerConfig,
		userId?: string
	): Promise<DiscoverResponse> {
		const startTime = Date.now();

		try {
			const show = await this.selectRandomShow(config, userId);

			if (!show) {
				// Fallback: try without restrictions
				const fallbackShow = await this.selectRandomShow(
					{
						...config,
						excludeRecent: false,
						minRating: undefined,
					},
					userId
				);

				if (!fallbackShow) {
					throw new Error(
						`No Netflix ${config.showType || "content"} found for ${
							config.country
						}`
					);
				}

				return this.buildResponse(
					fallbackShow,
					config.country as SupportedCountry,
					false,
					startTime
				);
			}

			// Track this pick for diversity
			if (userId) {
				this.trackUserPick(userId, show);
			}

			return this.buildResponse(
				show,
				config.country as SupportedCountry,
				false, // No cache anymore
				startTime
			);
		} catch (error) {
			console.error("[RandomPicker] Discovery failed:", error);
			throw error;
		}
	}

	/**
	 * Get picker statistics
	 */
	getStats(): PickerStats {
		return { ...this.stats };
	}

	/**
	 * Clear user's recent picks
	 */
	clearUserHistory(userId: string): void {
		this.recentPicks.delete(userId);
	}

	// Private methods

	private async selectRandomShow(
		config: RandomPickerConfig,
		userId?: string
	): Promise<NetflixShow | null> {
		const { country, showType, excludeRecent = true, minRating } = config;

		try {
			// Get popular shows from API directly (more reliable)
			const candidates =
				await streamingAvailabilityService.getPopularShows(
					country as SupportedCountry,
					showType === "any" ? undefined : showType
				);

			if (candidates.length === 0) {
				console.warn(
					`[RandomPicker] No candidates found for ${country} ${
						showType || "any"
					}`
				);
				return null;
			}

			// Apply filters
			let filteredCandidates = candidates;

			// Filter by minimum rating
			if (minRating) {
				filteredCandidates = filteredCandidates.filter(
					(show) => show.rating >= minRating
				);
			}

			// Filter out recent picks for this user
			if (excludeRecent && userId) {
				const recentPicks = this.getUserRecentPicks(userId);
				const recentIds = new Set(recentPicks.map((show) => show.id));
				filteredCandidates = filteredCandidates.filter(
					(show) => !recentIds.has(show.id)
				);
			}

			// Quality filters
			filteredCandidates = filteredCandidates.filter((show) => {
				return (
					show.title &&
					show.overview &&
					show.netflixLink &&
					show.imageSet?.verticalPoster?.w480 &&
					show.rating > 0
				);
			});

			if (filteredCandidates.length === 0) {
				console.warn(
					`[RandomPicker] No shows passed filters for ${country} ${
						showType || "any"
					}`
				);
				return null;
			}

			// Use weighted random selection based on rating
			return this.weightedRandomSelection(filteredCandidates);
		} catch (error) {
			console.error("[RandomPicker] API call failed:", error);
			throw error;
		}
	}

	private weightedRandomSelection(shows: NetflixShow[]): NetflixShow {
		// Weight shows by rating (higher rating = higher chance)
		const weights = shows.map((show) => {
			const rating = show.rating || 50;
			const normalizedRating = Math.max(rating, 30); // Minimum weight
			return normalizedRating;
		});

		const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
		const random = Math.random() * totalWeight;

		let currentWeight = 0;
		for (let i = 0; i < shows.length; i++) {
			currentWeight += weights[i];
			if (random <= currentWeight) {
				return shows[i];
			}
		}

		// Fallback to last show
		return shows[shows.length - 1];
	}

	private trackUserPick(userId: string, show: NetflixShow): void {
		if (!this.recentPicks.has(userId)) {
			this.recentPicks.set(userId, []);
		}

		const userPicks = this.recentPicks.get(userId)!;
		userPicks.unshift(show); // Add to beginning

		// Keep only recent picks
		if (userPicks.length > this.maxRecentPicks) {
			userPicks.splice(this.maxRecentPicks);
		}

		// Clean old users
		this.cleanupOldPicks();
	}

	private getUserRecentPicks(userId: string): NetflixShow[] {
		return this.recentPicks.get(userId) || [];
	}

	private cleanupOldPicks(): void {
		// Simple cleanup - keep only most recent 100 users
		if (this.recentPicks.size > 100) {
			const entries = Array.from(this.recentPicks.entries());
			entries.splice(50); // Keep only first 50
			this.recentPicks.clear();
			entries.forEach(([userId, picks]) => {
				this.recentPicks.set(userId, picks);
			});
		}
	}

	private buildResponse(
		show: NetflixShow,
		country: SupportedCountry,
		fromCache: boolean,
		startTime: number
	): DiscoverResponse {
		const responseTime = Date.now() - startTime;

		// Update stats
		this.stats.totalPicks++;
		this.stats.lastPickTimestamp = Date.now();
		this.stats.averageResponseTime =
			(this.stats.averageResponseTime * (this.stats.totalPicks - 1) +
				responseTime) /
			this.stats.totalPicks;

		return {
			show,
			country,
			fromCache,
			responseTime,
		};
	}

	/**
	 * Get show quality score for debugging
	 */
	getShowQualityScore(show: NetflixShow): number {
		let score = 0;

		// Basic data quality
		if (show.title) score += 10;
		if (show.overview && show.overview.length > 20) score += 10;
		if (show.netflixLink) score += 20;
		if (show.imageSet?.verticalPoster?.w480) score += 10;

		// Content quality
		if (show.rating > 70) score += 20;
		else if (show.rating > 50) score += 10;

		// Additional metadata
		if (show.genres && show.genres.length > 0) score += 5;
		if (show.cast && show.cast.length > 0) score += 5;
		if (show.directors && show.directors.length > 0) score += 5;
		if (show.creators && show.creators.length > 0) score += 5;

		return score;
	}
}

// Singleton instance
export const randomPickerService = new RandomPickerService();
