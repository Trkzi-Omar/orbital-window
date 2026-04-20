import { desc, eq } from 'drizzle-orm';

import { db, ensureDatabase } from '$lib/server/db';
import { savedLocations } from '$lib/server/db/schema';
import type { LocationSearchResult, SavedLocationRecord } from '$lib/types/orbital';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT =
	'Orbital Window/0.1 (+https://github.com/Trkzi-Omar/orbital-window; contact@omartrkzi.com)';
const MEMORY_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

type CachedLocation = {
	location: LocationSearchResult | null;
	expiresAt: number;
};

type SavedLocationRow = typeof savedLocations.$inferSelect;

const memoryCache = new Map<string, CachedLocation>();

function normalizeQuery(query: string) {
	return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function mapSavedRowToSearchResult(row: SavedLocationRow): LocationSearchResult {
	return {
		id: row.id,
		query: row.query,
		name: row.name,
		lat: row.lat,
		lon: row.lon,
		country: row.country,
		displayName: row.displayName,
		timezone: null
	};
}

function mapSavedRowToRecord(row: SavedLocationRow): SavedLocationRecord {
	return {
		id: row.id,
		name: row.name,
		query: row.query,
		lat: row.lat,
		lon: row.lon,
		country: row.country,
		displayName: row.displayName,
		isPinned: row.isPinned,
		createdAt: row.createdAt
	};
}

function setCacheEntry(queryNormalized: string, location: LocationSearchResult | null) {
	memoryCache.set(queryNormalized, {
		location,
		expiresAt: Date.now() + MEMORY_CACHE_TTL_MS
	});
}

function getCacheEntry(queryNormalized: string) {
	const cached = memoryCache.get(queryNormalized);
	if (!cached) {
		return null;
	}

	if (cached.expiresAt <= Date.now()) {
		memoryCache.delete(queryNormalized);
		return null;
	}

	return cached.location;
}

function toLocationSearchResult(
	query: string,
	payload: NominatimSearchResult
): LocationSearchResult {
	const parsedLat = Number(payload.lat);
	const parsedLon = Number(payload.lon);
	const displayName = payload.display_name.trim();
	const fallbackName = displayName.split(',')[0]?.trim() || query.trim();

	return {
		id: `nominatim:${payload.place_id}`,
		query,
		name: payload.name?.trim() || fallbackName,
		lat: parsedLat,
		lon: parsedLon,
		country: payload.address?.country ?? null,
		displayName,
		timezone: null
	};
}

async function fetchLocationFromNominatim(query: string) {
	const url = new URL(NOMINATIM_URL);
	url.search = new URLSearchParams({
		q: query,
		format: 'jsonv2',
		addressdetails: '1',
		limit: '1'
	}).toString();

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json',
			'Accept-Language': 'en',
			'User-Agent': NOMINATIM_USER_AGENT,
			Referer: 'https://github.com/Trkzi-Omar/orbital-window'
		}
	});

	if (!response.ok) {
		throw new Error(`Nominatim lookup failed: ${response.status}`);
	}

	const results = (await response.json()) as NominatimSearchResult[];
	if (!results.length) {
		return null;
	}

	return toLocationSearchResult(query, results[0]);
}

export async function listSavedLocations(): Promise<SavedLocationRecord[]> {
	await ensureDatabase();

	const rows = await db
		.select()
		.from(savedLocations)
		.orderBy(
			desc(savedLocations.isPinned),
			desc(savedLocations.updatedAt),
			desc(savedLocations.createdAt)
		);

	return rows.map(mapSavedRowToRecord);
}

export async function getSavedLocationById(id: string): Promise<LocationSearchResult | null> {
	await ensureDatabase();

	const row = await db.query.savedLocations.findFirst({
		where: eq(savedLocations.id, id)
	});

	return row ? mapSavedRowToSearchResult(row) : null;
}

export async function getPreferredSavedLocation(): Promise<LocationSearchResult | null> {
	await ensureDatabase();

	const [row] = await db
		.select()
		.from(savedLocations)
		.orderBy(
			desc(savedLocations.isPinned),
			desc(savedLocations.updatedAt),
			desc(savedLocations.createdAt)
		)
		.limit(1);

	return row ? mapSavedRowToSearchResult(row) : null;
}

export async function persistSavedLocation(location: LocationSearchResult) {
	await ensureDatabase();

	const queryNormalized = normalizeQuery(location.query);
	const now = new Date().toISOString();

	await db
		.insert(savedLocations)
		.values({
			query: location.query,
			queryNormalized,
			name: location.name,
			lat: location.lat,
			lon: location.lon,
			country: location.country,
			displayName: location.displayName,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: savedLocations.queryNormalized,
			set: {
				query: location.query,
				name: location.name,
				lat: location.lat,
				lon: location.lon,
				country: location.country,
				displayName: location.displayName,
				updatedAt: now
			}
		});

	const row = await db.query.savedLocations.findFirst({
		where: eq(savedLocations.queryNormalized, queryNormalized)
	});

	if (row) {
		const persisted = mapSavedRowToSearchResult(row);
		setCacheEntry(queryNormalized, persisted);
		return persisted;
	}

	setCacheEntry(queryNormalized, location);
	return location;
}

export async function toggleSavedLocationPin(id: string) {
	await ensureDatabase();

	const existing = await db.query.savedLocations.findFirst({
		where: eq(savedLocations.id, id)
	});

	if (!existing) {
		return null;
	}

	await db
		.update(savedLocations)
		.set({
			isPinned: !existing.isPinned,
			updatedAt: new Date().toISOString()
		})
		.where(eq(savedLocations.id, id));

	const updated = await db.query.savedLocations.findFirst({
		where: eq(savedLocations.id, id)
	});

	return updated ? mapSavedRowToRecord(updated) : null;
}

export async function deleteSavedLocation(id: string) {
	await ensureDatabase();

	const existing = await db.query.savedLocations.findFirst({
		where: eq(savedLocations.id, id)
	});

	if (!existing) {
		return false;
	}

	await db.delete(savedLocations).where(eq(savedLocations.id, id));
	memoryCache.delete(existing.queryNormalized);

	return true;
}

export async function searchLocation(
	query: string,
	options: {
		persist?: boolean;
	} = {}
): Promise<LocationSearchResult | null> {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return null;
	}

	await ensureDatabase();

	const queryNormalized = normalizeQuery(trimmedQuery);
	const cached = getCacheEntry(queryNormalized);
	if (cached) {
		return options.persist ? persistSavedLocation(cached) : cached;
	}

	const existing = await db.query.savedLocations.findFirst({
		where: eq(savedLocations.queryNormalized, queryNormalized)
	});
	if (existing) {
		const location = mapSavedRowToSearchResult(existing);
		setCacheEntry(queryNormalized, location);
		return options.persist ? persistSavedLocation(location) : location;
	}

	const externalResult = await fetchLocationFromNominatim(trimmedQuery);
	setCacheEntry(queryNormalized, externalResult);
	if (!externalResult) {
		return null;
	}

	return options.persist ? persistSavedLocation(externalResult) : externalResult;
}

type NominatimSearchResult = {
	place_id: string | number;
	lat: string;
	lon: string;
	display_name: string;
	name?: string;
	address?: {
		country?: string;
	};
};
