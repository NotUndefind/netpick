// NetPick API - Supported Countries Endpoint
// GET /api/countries - List of supported countries and their streaming services

import { NextResponse } from 'next/server';
import { SUPPORTED_COUNTRIES } from '@/lib/types/netflix';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const countries = Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => ({
      code,
      name,
      flag: getFlagEmoji(code),
      services: ['netflix'] // Currently only Netflix supported
    }));

    const response = {
      success: true,
      data: {
        countries,
        defaultCountry: 'us',
        supportedServices: ['netflix'],
        metadata: {
          totalCountries: countries.length,
          timestamp: new Date().toISOString()
        }
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('[Countries] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch supported countries',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function getFlagEmoji(countryCode: string): string {
  const flags: Record<string, string> = {
    us: '🇺🇸',
    fr: '🇫🇷',
    ca: '🇨🇦',
    gb: '🇬🇧',
    de: '🇩🇪'
  };

  return flags[countryCode] || '🌍';
}