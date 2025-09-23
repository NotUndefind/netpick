// NetPick Types - Netflix Content & Streaming Data

export interface NetflixShow {
  id: string;
  tmdbId?: string;
  imdbId?: string;
  title: string;
  originalTitle: string;
  overview: string;
  showType: 'movie' | 'series';
  releaseYear?: number;
  firstAirYear?: number;
  lastAirYear?: number;
  rating: number;
  genres: Genre[];
  runtime?: number;
  seasonCount?: number;
  episodeCount?: number;
  imageSet: ShowImageSet;
  streamingOptions: StreamingOptionsMap;
  netflixLink?: string;
  directors?: string[];
  creators?: string[];
  cast: string[];
}

export interface Genre {
  id: string;
  name: string;
}

export interface ShowImageSet {
  verticalPoster: VerticalImage;
  horizontalPoster: HorizontalImage;
  verticalBackdrop?: VerticalImage;
  horizontalBackdrop?: HorizontalImage;
}

export interface VerticalImage {
  w240: string;
  w360: string;
  w480: string;
  w600: string;
  w720: string;
}

export interface HorizontalImage {
  w360: string;
  w480: string;
  w720: string;
  w1080: string;
  w1440: string;
}

export interface StreamingOptionsMap {
  [countryCode: string]: StreamingOption[];
}

export interface StreamingOption {
  service: ServiceInfo;
  type: 'free' | 'subscription' | 'buy' | 'rent' | 'addon';
  link: string;
  videoLink?: string;
  quality: 'sd' | 'hd' | 'qhd' | 'uhd';
  audios: Locale[];
  subtitles: Subtitle[];
  expiresSoon: boolean;
  expiresOn?: number;
  availableSince: number;
}

export interface ServiceInfo {
  id: string;
  name: string;
  homePage: string;
  themeColorCode: string;
  imageSet: ServiceImageSet;
}

export interface ServiceImageSet {
  lightThemeImage: string;
  darkThemeImage: string;
  whiteImage: string;
}

export interface Locale {
  language: string;
  region?: string;
}

export interface Subtitle {
  closedCaptions: boolean;
  locale: Locale;
}

// Cache Types
export interface CachePool {
  shows: NetflixShow[];
  lastUpdate: number;
  country: string;
  showType: 'movie' | 'series' | 'any';
}

export interface CacheMetadata {
  totalShows: number;
  lastGlobalRefresh: number;
  poolSizes: Record<string, number>;
  hitRate: number;
  missCount: number;
  hitCount: number;
}

export interface RandomPickerConfig {
  country: string;
  showType?: 'movie' | 'series' | 'any';
  excludeRecent?: boolean;
  minRating?: number;
}

export interface DiscoverResponse {
  show: NetflixShow;
  country: string;
  fromCache: boolean;
  responseTime: number;
}

// API Response Types
export interface StreamingAvailabilitySearchResponse {
  shows: NetflixShow[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface StreamingAvailabilityResponse {
  shows: NetflixShow[];
  hasMore: boolean;
  nextCursor?: string;
}

// Countries
export const SUPPORTED_COUNTRIES = {
  us: 'United States',
  fr: 'France',
  ca: 'Canada',
  gb: 'United Kingdom',
  de: 'Germany'
} as const;

export type SupportedCountry = keyof typeof SUPPORTED_COUNTRIES;

// Error Types
export interface NetPickError {
  code: string;
  message: string;
  details?: any;
}

export class CacheError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'CacheError';
  }
}

export class APIError extends Error {
  constructor(message: string, public statusCode?: number, public details?: any) {
    super(message);
    this.name = 'APIError';
  }
}