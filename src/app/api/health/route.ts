// NetPick API - Health Check Endpoint
// GET /api/health - System health status

import { NextResponse } from "next/server";
import { randomPickerService } from "@/lib/services/randomPicker";
import { streamingAvailabilityService } from "@/lib/services/streamingAvailability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const startTime = Date.now();

	try {
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
		const isHealthy = apiHealth.status === "ok";
		const overallStatus = isHealthy ? "healthy" : "degraded";

		const response = {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			responseTime: Date.now() - startTime,
			services: {
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
				streamingAPI: {
					status: apiHealth.status,
					message: apiHealth.message,
				},
			},
			environment: {
				nodeEnv: process.env.NODE_ENV,
				supportedCountries: process.env.SUPPORTED_COUNTRIES?.split(
					","
				) || ["us"],
				architecture: "direct-api", // No cache anymore
			},
		};

		// Set appropriate HTTP status
		const httpStatus = overallStatus === "healthy" ? 200 : 207;

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