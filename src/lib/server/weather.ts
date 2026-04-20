import type { LocationSearchResult, WeatherPoint, WeatherSummary } from '$lib/types/orbital';

const WEATHER_CACHE_TTL_MS = 1000 * 60 * 10;
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

type WeatherCache = {
	context: WeatherContext;
	expiresAt: number;
};

const weatherCache = new Map<string, WeatherCache>();

export type WeatherContext = {
	summary: WeatherSummary;
	cloudCoverAt: (date: Date) => number | null;
	isNightAt: (date: Date) => boolean;
};

export function createFallbackWeatherContext(timezone: string | null = 'UTC'): WeatherContext {
	return {
		summary: {
			timezone: timezone ?? 'UTC',
			sunrise: null,
			sunset: null,
			hourlyCloudCover: [],
			sunWindows: []
		},
		cloudCoverAt() {
			return null;
		},
		isNightAt() {
			return false;
		}
	};
}

export async function getWeatherContext(location: LocationSearchResult): Promise<WeatherContext> {
	const cacheKey = `${location.lat.toFixed(3)},${location.lon.toFixed(3)}`;
	const cached = weatherCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.context;
	}

	const url = new URL(OPEN_METEO_URL);
	url.search = new URLSearchParams({
		latitude: location.lat.toString(),
		longitude: location.lon.toString(),
		hourly: 'cloud_cover,is_day',
		daily: 'sunrise,sunset',
		forecast_days: '2',
		timezone: 'auto',
		timeformat: 'unixtime'
	}).toString();

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Open-Meteo request failed: ${response.status}`);
	}

	const data = (await response.json()) as OpenMeteoResponse;
	const hourlyTimes = data.hourly?.time ?? [];
	const hourlyCloudCover = data.hourly?.cloud_cover ?? [];
	const hourlyIsDay = data.hourly?.is_day ?? [];

	const summary: WeatherSummary = {
		timezone: data.timezone,
		sunrise: getUpcomingSolarEvent(data.daily?.sunrise ?? []),
		sunset: getUpcomingSolarEvent(data.daily?.sunset ?? []),
		hourlyCloudCover: hourlyTimes.map<WeatherPoint>((timestamp, index) => ({
			time: toIso(timestamp),
			cloudCover: hourlyCloudCover[index] ?? 0
		})),
		sunWindows: buildSunWindows(data.daily?.sunrise ?? [], data.daily?.sunset ?? [], data.timezone)
	};

	const context: WeatherContext = {
		summary,
		cloudCoverAt(date: Date) {
			if (!hourlyTimes.length) {
				return null;
			}

			const target = date.getTime();
			let closestIndex = 0;
			let smallestDelta = Number.POSITIVE_INFINITY;

			for (let index = 0; index < hourlyTimes.length; index += 1) {
				const delta = Math.abs(hourlyTimes[index] * 1000 - target);
				if (delta < smallestDelta) {
					smallestDelta = delta;
					closestIndex = index;
				}
			}

			return hourlyCloudCover[closestIndex] ?? null;
		},
		isNightAt(date: Date) {
			if (!hourlyTimes.length) {
				return false;
			}

			const target = date.getTime();
			let closestIndex = 0;
			let smallestDelta = Number.POSITIVE_INFINITY;

			for (let index = 0; index < hourlyTimes.length; index += 1) {
				const delta = Math.abs(hourlyTimes[index] * 1000 - target);
				if (delta < smallestDelta) {
					smallestDelta = delta;
					closestIndex = index;
				}
			}

			return hourlyIsDay[closestIndex] === 0;
		}
	};

	weatherCache.set(cacheKey, {
		context,
		expiresAt: Date.now() + WEATHER_CACHE_TTL_MS
	});

	return context;
}

function getUpcomingSolarEvent(unixTimestamps: number[]) {
	const now = Date.now();
	for (const timestamp of unixTimestamps) {
		const millis = timestamp * 1000;
		if (millis >= now) {
			return new Date(millis).toISOString();
		}
	}

	return unixTimestamps[0] ? new Date(unixTimestamps[0] * 1000).toISOString() : null;
}

function toIso(unixTimestamp: number) {
	return new Date(unixTimestamp * 1000).toISOString();
}

function buildSunWindows(sunriseEntries: number[], sunsetEntries: number[], timezone: string) {
	return sunriseEntries
		.map((sunrise, index) => {
			const sunset = sunsetEntries[index];
			if (!sunrise || !sunset) {
				return null;
			}

			return {
				date: formatDateKey(sunrise, timezone),
				sunrise: new Date(sunrise * 1000).toISOString(),
				sunset: new Date(sunset * 1000).toISOString()
			};
		})
		.filter((entry): entry is { date: string; sunrise: string; sunset: string } => Boolean(entry));
}

function formatDateKey(unixTimestamp: number, timezone: string) {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const parts = formatter.formatToParts(new Date(unixTimestamp * 1000));
	const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
	const month = parts.find((part) => part.type === 'month')?.value ?? '01';
	const day = parts.find((part) => part.type === 'day')?.value ?? '01';

	return `${year}-${month}-${day}`;
}

type OpenMeteoResponse = {
	timezone: string;
	hourly?: {
		time: number[];
		cloud_cover: number[];
		is_day: number[];
	};
	daily?: {
		sunrise: number[];
		sunset: number[];
	};
};
