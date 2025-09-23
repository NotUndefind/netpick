// NetPick API - Health Check Endpoint
// GET /api/health - System health and cache status

import { NextResponse } from "next/server";
import { netPickCache, PoolStats } from "@/lib/services/cache";
import { randomPickerService } from "@/lib/services/randomPicker";
import { streamingAvailabilityService } from "@/lib/services/streamingAvailability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const startTime = Date.now();

	try {
		// Check cache health
		const cacheHealth = netPickCache.healthCheck();
		const cacheStats = netPickCache.getStats();

		// Check picker stats
		const pickerStats = randomPickerService.getStats();

		// Check external API health
		let apiHealth;
		try {
			apiHealth = await streamingAvailabilityService.healthCheck();
		} catch (error) {
			apiHealth = {
				status: "error",
				message:
					error instanceof Error
						? error.message
						: "API health check failed",
			};
		}

		// Determine overall system health
		const isHealthy =
			cacheHealth.status === "healthy" && apiHealth.status === "ok";
		const isDegraded =
			cacheHealth.status === "degraded" || apiHealth.status === "error";

		const overallStatus = isHealthy
			? "healthy"
			: isDegraded
			? "degraded"
			: "unhealthy";

		const response = {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			responseTime: Date.now() - startTime,
			services: {
				cache: {
					status: cacheHealth.status,
					stats: {
						totalShows: cacheStats.totalShows,
						hitRate: cacheStats.hitRate,
						poolCount: Object.keys(cacheStats.poolSizes).length,
						activePools: Object.entries(cacheStats.poolInfo).filter(
							([_, info]: [string, PoolStats]) => info.size > 0
						).length,
					},
					pools: cacheStats.poolInfo,
				},
				picker: {
					status: "healthy",
					stats: {
						totalPicks: pickerStats.totalPicks,
						averageResponseTime: Math.round(
							pickerStats.averageResponseTime
						),
						lastPick: pickerStats.lastPickTimestamp
							? new Date(
									pickerStats.lastPickTimestamp
							  ).toISOString()
							: null,
					},
				},
				externalAPI: {
					status: apiHealth.status,
					message: apiHealth.message,
				},
			},
			environment: {
				nodeEnv: process.env.NODE_ENV,
				supportedCountries: process.env.SUPPORTED_COUNTRIES?.split(
					","
				) || ["us"],
				cacheConfig: {
					poolSize: process.env.CACHE_POOL_SIZE || "200",
					ttlHours: process.env.CACHE_TTL_HOURS || "6",
					minPoolSize: process.env.CACHE_MIN_POOL_SIZE || "50",
				},
			},
		};

		// Set appropriate HTTP status
		const httpStatus =
			overallStatus === "healthy"
				? 200
				: overallStatus === "degraded"
				? 207
				: 503;

		return NextResponse.json(response, {
			status: httpStatus,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache, no-store, must-revalidate",
			},
		});
	} catch (error) {
		console.error("[Health] Health check error:", error);

		return NextResponse.json(
			{
				status: "unhealthy",
				error:
					error instanceof Error
						? error.message
						: "Health check failed",
				timestamp: new Date().toISOString(),
				responseTime: Date.now() - startTime,
			},
			{ status: 500 }
		);
	}
}
