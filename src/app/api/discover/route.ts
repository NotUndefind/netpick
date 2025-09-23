// NetPick API - Main Discover Endpoint
// GET /api/discover - Returns random Netflix content

import { NextRequest, NextResponse } from 'next/server';
import { randomPickerService } from '@/lib/services/randomPicker';
import { SUPPORTED_COUNTRIES, SupportedCountry } from '@/lib/types/netflix';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rate limiting (simple in-memory store)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_USER || '100');
const RATE_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') as SupportedCountry || 'us';
    const showType = searchParams.get('type') as 'movie' | 'series' | 'any' || 'any';
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!) : undefined;
    const userId = searchParams.get('userId') || clientIP; // Use IP as fallback user ID

    // Validate parameters
    if (!Object.keys(SUPPORTED_COUNTRIES).includes(country)) {
      return NextResponse.json(
        {
          error: 'Invalid country',
          supportedCountries: Object.keys(SUPPORTED_COUNTRIES)
        },
        { status: 400 }
      );
    }

    if (showType && !['movie', 'series', 'any'].includes(showType)) {
      return NextResponse.json(
        {
          error: 'Invalid type',
          supportedTypes: ['movie', 'series', 'any']
        },
        { status: 400 }
      );
    }

    if (minRating && (minRating < 0 || minRating > 100)) {
      return NextResponse.json(
        { error: 'Invalid minRating. Must be between 0 and 100.' },
        { status: 400 }
      );
    }

    // Configure random picker
    const config = {
      country,
      showType: showType === 'any' ? undefined : showType,
      excludeRecent: true,
      minRating
    };

    console.log(`[API] Discover request: ${JSON.stringify(config)} from ${clientIP}`);

    // Get random show via direct API call
    const result = await randomPickerService.discover(config, userId);

    // Build response
    const response = {
      success: true,
      data: {
        show: {
          id: result.show.id,
          title: result.show.title,
          originalTitle: result.show.originalTitle,
          overview: result.show.overview,
          showType: result.show.showType,
          releaseYear: result.show.releaseYear,
          firstAirYear: result.show.firstAirYear,
          lastAirYear: result.show.lastAirYear,
          rating: result.show.rating,
          genres: result.show.genres,
          runtime: result.show.runtime,
          seasonCount: result.show.seasonCount,
          episodeCount: result.show.episodeCount,
          cast: result.show.cast?.slice(0, 5), // Limit cast for performance
          directors: result.show.directors,
          creators: result.show.creators,
          images: {
            poster: result.show.imageSet.verticalPoster?.w480 || result.show.imageSet.verticalPoster?.w360,
            backdrop: result.show.imageSet.horizontalPoster?.w720 || result.show.imageSet.horizontalPoster?.w480,
            posterSizes: result.show.imageSet.verticalPoster,
            backdropSizes: result.show.imageSet.horizontalPoster
          },
          netflixLink: result.show.netflixLink,
          tmdbId: result.show.tmdbId,
          imdbId: result.show.imdbId
        },
        metadata: {
          country: result.country,
          fromCache: result.fromCache,
          responseTime: result.responseTime,
          requestId: generateRequestId(),
          timestamp: new Date().toISOString()
        }
      }
    };

    // Add performance headers
    const totalTime = Date.now() - startTime;
    const headers = new Headers({
      'X-Response-Time': `${totalTime}ms`,
      'X-Cache-Hit': result.fromCache ? 'true' : 'false',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    });

    console.log(`[API] Discover response: ${result.show.title} (${result.show.showType}) in ${totalTime}ms`);

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('[API] Discover error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const totalTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        metadata: {
          responseTime: totalTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// Helper functions

function getClientIP(request: NextRequest): string {
  // Try various headers to get the real client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a default
  return 'unknown';
}

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const key = clientIP;

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  const clientData = requestCounts.get(key)!;

  // Reset if window has passed
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_WINDOW;
    return true;
  }

  // Check if under limit
  if (clientData.count < RATE_LIMIT) {
    clientData.count++;
    return true;
  }

  return false;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// Periodic cleanup of rate limit data
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime + RATE_WINDOW) {
      requestCounts.delete(key);
    }
  }
}, RATE_WINDOW);