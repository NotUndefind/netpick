// NetPick - Streaming Availability API Service
// Handles all communication with Streaming Availability API

import {
	NetflixShow,
	StreamingAvailabilitySearchResponse,
	SupportedCountry,
	APIError,
} from "@/lib/types/netflix";

export interface SearchFiltersParams {
	country: SupportedCountry;
	catalogs?: string; // Default: 'netflix'
	showType?: "movie" | "series";
	orderBy?: "original_title" | "popularity_1year" | "rating" | "release_date";
	orderDirection?: "asc" | "desc";
	cursor?: string;
	limit?: number;
}

export class StreamingAvailabilityService {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly defaultHeaders: Record<string, string>;

	constructor() {
		this.apiKey = process.env.STREAMING_AVAILABILITY_API_KEY || "";
		this.baseUrl =
			process.env.STREAMING_AVAILABILITY_BASE_URL ||
			"https://streaming-availability.p.rapidapi.com";

		if (!this.apiKey) {
			throw new Error("STREAMING_AVAILABILITY_API_KEY is required");
		}

		this.defaultHeaders = {
			"X-RapidAPI-Key": this.apiKey,
			"X-RapidAPI-Host": "streaming-availability.p.rapidapi.com",
			"Content-Type": "application/json",
		};
	}

	/**
	 * Search Netflix shows by filters - Main method for getting Netflix content
	 */
	async searchShows(
		params: SearchFiltersParams
	): Promise<StreamingAvailabilitySearchResponse> {
		try {
			const searchParams = new URLSearchParams({
				country: params.country,
				catalogs: params.catalogs || "netflix",
				...(params.showType && { show_type: params.showType }),
				...(params.orderBy && { order_by: params.orderBy }),
				...(params.orderDirection && {
					order_direction: params.orderDirection,
				}),
				...(params.cursor && { cursor: params.cursor }),
				series_granularity: "show", // Don't need season/episode details for MVP
				output_language: "en",
			});

			const url = `${
				this.baseUrl
			}/shows/search/filters?${searchParams.toString()}`;

			console.log(`[StreamingAvailability] Fetching: ${url}`);

			const response = await fetch(url, {
				method: "GET",
				headers: this.defaultHeaders,
			});

			if (!response.ok) {
				throw new APIError(
					`Streaming Availability API error: ${response.status}`,
					response.status,
					await response.text()
				);
			}

			const data = await response.json();

			// Transform API response to our Netflix show format
			const shows: NetflixShow[] = data.shows.map((show: any) =>
				this.transformShow(show, params.country)
			);

			return {
				shows,
				hasMore: data.hasMore || false,
				nextCursor: data.nextCursor,
			};
		} catch (error) {
			console.error("[StreamingAvailability] Search error:", error);

			if (error instanceof APIError) {
				throw error;
			}

			throw new APIError(
				"Failed to fetch Netflix shows",
				500,
				error instanceof Error ? error.message : "Unknown error"
			);
		}
	}

	/**
	 * Get popular Netflix shows for a country
	 */
	async getPopularShows(
		country: SupportedCountry,
		showType?: "movie" | "series"
	): Promise<NetflixShow[]> {
		const result = await this.searchShows({
			country,
			showType,
			orderBy: "popularity_1year",
			orderDirection: "desc",
		});

		return result.shows;
	}

	/**
	 * Get random page of Netflix shows
	 */
	async getRandomPage(
		country: SupportedCountry,
		showType?: "movie" | "series"
	): Promise<NetflixShow[]> {
		// Generate random cursor for pagination diversity
		const randomPage = Math.floor(Math.random() * 50) + 1; // Pages 1-50
		const randomCursor = this.generateRandomCursor(randomPage);

		const result = await this.searchShows({
			country,
			showType,
			orderBy: "popularity_1year",
			orderDirection: "desc",
			cursor: randomCursor,
		});

		return result.shows;
	}

	/**
	 * Transform API response to our NetflixShow interface
	 */
	private transformShow(
		apiShow: any,
		country: SupportedCountry
	): NetflixShow {
		// Extract Netflix streaming option for the country
		const netflixOption = apiShow.streamingOptions?.[country]?.find(
			(option: any) => option.service.id === "netflix"
		);

		return {
			id: apiShow.id,
			tmdbId: apiShow.tmdbId,
			imdbId: apiShow.imdbId,
			title: apiShow.title,
			originalTitle: apiShow.originalTitle || apiShow.title,
			overview: apiShow.overview || "",
			showType: apiShow.showType,
			releaseYear: apiShow.releaseYear,
			firstAirYear: apiShow.firstAirYear,
			lastAirYear: apiShow.lastAirYear,
			rating: apiShow.rating || 0,
			genres: apiShow.genres || [],
			runtime: apiShow.runtime,
			seasonCount: apiShow.seasonCount,
			episodeCount: apiShow.episodeCount,
			imageSet: apiShow.imageSet || this.getDefaultImages(),
			streamingOptions: apiShow.streamingOptions || {},
			netflixLink: netflixOption?.link,
			directors: apiShow.directors || [],
			creators: apiShow.creators || [],
			cast: apiShow.cast || [],
		};
	}

	/**
	 * Generate random cursor for pagination diversity
	 */
	private generateRandomCursor(page: number): string {
		// Simple cursor generation - in real implementation this would be more sophisticated
		return btoa(`page:${page}:${Date.now()}`);
	}

	/**
	 * Default fallback images
	 */
	private getDefaultImages() {
		return {
			verticalPoster: {
				w240: "/placeholder-poster-240.jpg",
				w360: "/placeholder-poster-360.jpg",
				w480: "/placeholder-poster-480.jpg",
				w600: "/placeholder-poster-600.jpg",
				w720: "/placeholder-poster-720.jpg",
			},
			horizontalPoster: {
				w360: "/placeholder-backdrop-360.jpg",
				w480: "/placeholder-backdrop-480.jpg",
				w720: "/placeholder-backdrop-720.jpg",
				w1080: "/placeholder-backdrop-1080.jpg",
				w1440: "/placeholder-backdrop-1440.jpg",
			},
		};
	}

	/**
	 * Health check for the service
	 */
	async healthCheck(): Promise<{ status: "ok" | "error"; message: string }> {
		try {
			// Test with a minimal request
			await this.searchShows({
				country: "us",
				showType: "movie",
				limit: 1,
			});

			return {
				status: "ok",
				message: "Streaming Availability API is healthy",
			};
		} catch (error) {
			return {
				status: "error",
				message:
					error instanceof Error
						? error.message
						: "Health check failed",
			};
		}
	}
}

// Singleton instance
export const streamingAvailabilityService = new StreamingAvailabilityService();
