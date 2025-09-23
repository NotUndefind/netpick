// NetPick - Intelligent Cache System
// Memory-based cache for 100 req/sec performance without database

import {
	NetflixShow,
	CachePool,
	CacheMetadata,
	SupportedCountry,
	CacheError,
	SUPPORTED_COUNTRIES,
} from "@/lib/types/netflix";
import { streamingAvailabilityService } from "./streamingAvailability";

export interface CacheConfig {
	poolSize: number;
	minPoolSize: number;
	ttlHours: number;
	refreshIntervalMs: number;
}

export interface PoolStats {
	size: number;
	lastUpdate: string;
	isExpired: boolean;
	isRefreshing: boolean;
}

export class NetPickCache {
	private pools: Map<string, CachePool> = new Map();
	private metadata: CacheMetadata;
	private refreshJobs: Map<string, NodeJS.Timeout> = new Map();
	private isRefreshing: Set<string> = new Set();
	private readonly config: CacheConfig;

	constructor(config?: Partial<CacheConfig>) {
		this.config = {
			poolSize: parseInt(process.env.CACHE_POOL_SIZE || "200"),
			minPoolSize: parseInt(process.env.CACHE_MIN_POOL_SIZE || "50"),
			ttlHours: parseInt(process.env.CACHE_TTL_HOURS || "6"),
			refreshIntervalMs: 6 * 60 * 60 * 1000, // 6 hours
			...config,
		};

		this.metadata = {
			totalShows: 0,
			lastGlobalRefresh: Date.now(),
			poolSizes: {},
			hitRate: 0,
			missCount: 0,
			hitCount: 0,
		};

		// Initialize pools for all supported countries and types
		this.initializePools();

		// Start background refresh jobs
		this.startBackgroundJobs();

		console.log("[Cache] Initialized with config:", this.config);
	}

	/**
	 * Get random show from cache pool
	 */
	async getRandomShow(
		country: SupportedCountry,
		showType?: "movie" | "series"
	): Promise<NetflixShow | null> {
		const poolKey = this.getPoolKey(country, showType);
		const pool = this.pools.get(poolKey);

		if (!pool || this.isPoolExpired(pool) || pool.shows.length === 0) {
			this.recordCacheMiss();

			// Try to refresh pool if it's empty or expired
			if (!this.isRefreshing.has(poolKey)) {
				this.refreshPool(poolKey, country, showType).catch(
					console.error
				);
			}

			return null;
		}

		// Check if pool needs background refresh
		if (pool.shows.length < this.config.minPoolSize) {
			// Trigger background refresh without waiting
			if (!this.isRefreshing.has(poolKey)) {
				this.refreshPool(poolKey, country, showType).catch(
					console.error
				);
			}
		}

		this.recordCacheHit();

		// Return random show from pool
		const randomIndex = Math.floor(Math.random() * pool.shows.length);
		return pool.shows[randomIndex];
	}

	/**
	 * Get multiple random shows for variety
	 */
	async getRandomShows(
		country: SupportedCountry,
		count: number = 5,
		showType?: "movie" | "series"
	): Promise<NetflixShow[]> {
		const poolKey = this.getPoolKey(country, showType);
		const pool = this.pools.get(poolKey);

		if (!pool || this.isPoolExpired(pool) || pool.shows.length === 0) {
			return [];
		}

		// Shuffle and return requested count
		const shuffled = [...pool.shows].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, Math.min(count, shuffled.length));
	}

	/**
	 * Force refresh a specific pool
	 */
	async refreshPool(
		poolKey: string,
		country: SupportedCountry,
		showType?: "movie" | "series"
	): Promise<void> {
		if (this.isRefreshing.has(poolKey)) {
			console.log(`[Cache] Pool ${poolKey} already refreshing, skipping`);
			return;
		}

		this.isRefreshing.add(poolKey);

		try {
			console.log(`[Cache] Refreshing pool: ${poolKey}`);

			const shows: NetflixShow[] = [];
			let cursor: string | undefined;
			let attempts = 0;
			const maxAttempts = 10; // Limit to prevent infinite loops

			// Collect shows from multiple pages to fill the pool
			while (
				shows.length < this.config.poolSize &&
				attempts < maxAttempts
			) {
				try {
					const result =
						await streamingAvailabilityService.searchShows({
							country,
							showType,
							orderBy: "popularity_1year",
							orderDirection: "desc",
							cursor,
						});

					if (result.shows.length === 0) {
						break;
					}

					// Filter shows with Netflix links and good data
					const validShows = result.shows.filter(
						(show) =>
							show.netflixLink &&
							show.title &&
							show.overview &&
							show.imageSet?.verticalPoster?.w480
					);

					shows.push(...validShows);

					if (!result.hasMore || !result.nextCursor) {
						break;
					}

					cursor = result.nextCursor;
					attempts++;
				} catch (error) {
					console.error(
						`[Cache] Error fetching page ${attempts} for ${poolKey}:`,
						error
					);
					break;
				}
			}

			// Update pool
			if (shows.length > 0) {
				const pool: CachePool = {
					shows: shows.slice(0, this.config.poolSize), // Limit to configured size
					lastUpdate: Date.now(),
					country,
					showType: showType || "any",
				};

				this.pools.set(poolKey, pool);
				this.metadata.poolSizes[poolKey] = pool.shows.length;
				this.metadata.totalShows = Array.from(
					this.pools.values()
				).reduce((sum, p) => sum + p.shows.length, 0);

				console.log(
					`[Cache] Pool ${poolKey} refreshed with ${pool.shows.length} shows`
				);
			} else {
				console.warn(`[Cache] No shows found for pool ${poolKey}`);
			}
		} catch (error) {
			console.error(`[Cache] Failed to refresh pool ${poolKey}:`, error);
			throw new CacheError(
				`Failed to refresh cache pool: ${poolKey}`,
				error
			);
		} finally {
			this.isRefreshing.delete(poolKey);
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheMetadata & { poolInfo: Record<string, PoolStats> } {
		const totalRequests = this.metadata.hitCount + this.metadata.missCount;
		const hitRate =
			totalRequests > 0 ? this.metadata.hitCount / totalRequests : 0;

		const poolInfo: Record<string, PoolStats> = {};
		for (const [key, pool] of this.pools.entries()) {
			poolInfo[key] = {
				size: pool.shows.length,
				lastUpdate: new Date(pool.lastUpdate).toISOString(),
				isExpired: this.isPoolExpired(pool),
				isRefreshing: this.isRefreshing.has(key),
			};
		}

		return {
			...this.metadata,
			hitRate: Math.round(hitRate * 100) / 100,
			poolInfo,
		};
	}

	/**
	 * Clear all caches
	 */
	clearCache(): void {
		this.pools.clear();
		this.metadata.totalShows = 0;
		this.metadata.poolSizes = {};
		this.metadata.hitCount = 0;
		this.metadata.missCount = 0;
		console.log("[Cache] All pools cleared");
	}

	/**
	 * Health check
	 */
	healthCheck(): {
		status: "healthy" | "degraded" | "unhealthy";
		details: object;
	} {
		const stats = this.getStats();
		const activePools = Object.keys(stats.poolSizes).length;
		const totalShows = stats.totalShows;
		const hitRate = stats.hitRate;

		if (totalShows === 0 || activePools === 0) {
			return {
				status: "unhealthy",
				details: { reason: "No cached shows available", stats },
			};
		}

		if (hitRate < 0.8 || totalShows < this.config.minPoolSize * 4) {
			return {
				status: "degraded",
				details: {
					reason: "Low hit rate or insufficient cache size",
					stats,
				},
			};
		}

		return {
			status: "healthy",
			details: { stats },
		};
	}

	// Private methods

	private initializePools(): void {
		// Create pools for all country-type combinations
		Object.keys(SUPPORTED_COUNTRIES).forEach((country) => {
			["movie", "series"].forEach((showType) => {
				const poolKey = this.getPoolKey(
					country as SupportedCountry,
					showType as "movie" | "series"
				);
				this.pools.set(poolKey, {
					shows: [],
					lastUpdate: 0,
					country: country as SupportedCountry,
					showType: showType as "movie" | "series",
				});
			});
		});
	}

	private startBackgroundJobs(): void {
		// Stagger refresh jobs to avoid API rate limits
		let delay = 0;

		Object.keys(SUPPORTED_COUNTRIES).forEach((country) => {
			["movie", "series"].forEach((showType) => {
				const poolKey = this.getPoolKey(
					country as SupportedCountry,
					showType as "movie" | "series"
				);

				setTimeout(() => {
					// Initial population
					this.refreshPool(
						poolKey,
						country as SupportedCountry,
						showType as "movie" | "series"
					).catch(console.error);

					// Schedule recurring refresh
					const intervalId = setInterval(() => {
						this.refreshPool(
							poolKey,
							country as SupportedCountry,
							showType as "movie" | "series"
						).catch(console.error);
					}, this.config.refreshIntervalMs);

					this.refreshJobs.set(poolKey, intervalId);
				}, delay);

				delay += 10000; // 10 second delay between each pool initialization
			});
		});
	}

	private getPoolKey(
		country: SupportedCountry,
		showType?: "movie" | "series"
	): string {
		return `${country}-${showType || "any"}`;
	}

	private isPoolExpired(pool: CachePool): boolean {
		const ttlMs = this.config.ttlHours * 60 * 60 * 1000;
		return Date.now() - pool.lastUpdate > ttlMs;
	}

	private recordCacheHit(): void {
		this.metadata.hitCount++;
	}

	private recordCacheMiss(): void {
		this.metadata.missCount++;
	}

	/**
	 * Cleanup method for graceful shutdown
	 */
	destroy(): void {
		// Clear all refresh intervals
		for (const intervalId of this.refreshJobs.values()) {
			clearInterval(intervalId);
		}
		this.refreshJobs.clear();
		this.pools.clear();
		console.log("[Cache] Destroyed");
	}
}

// Singleton instance
export const netPickCache = new NetPickCache();
