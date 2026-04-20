import { CURATED_SATELLITES } from '$lib/server/catalog';
import type { CuratedSatellite } from '$lib/types/orbital';

const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php';
const CELESTRAK_CACHE_TTL_MS = 1000 * 60 * 30;
const CELESTRAK_USER_AGENT =
	'Orbital Window/0.1 (+https://github.com/Trkzi-Omar/orbital-window; contact@omartrkzi.com)';

type CelesTrakCache = {
	entries: CelesTrakEntry[];
	expiresAt: number;
};

let cache: CelesTrakCache | null = null;

export type CelesTrakEntry = {
	satellite: CuratedSatellite;
	catalogName: string;
	catalogId: string;
	line1: string;
	line2: string;
};

export async function getCuratedSatelliteElements(): Promise<CelesTrakEntry[]> {
	if (cache && cache.expiresAt > Date.now()) {
		return cache.entries;
	}

	const results = await Promise.all(
		CURATED_SATELLITES.map((satellite) => fetchSatelliteElement(satellite))
	);
	const entries = results.filter((entry): entry is CelesTrakEntry => Boolean(entry));

	if (!entries.length) {
		throw new Error('CelesTrak returned no curated satellite elements.');
	}

	cache = {
		entries,
		expiresAt: Date.now() + CELESTRAK_CACHE_TTL_MS
	};

	return entries;
}

async function fetchSatelliteElement(satellite: CuratedSatellite): Promise<CelesTrakEntry | null> {
	const url = new URL(CELESTRAK_URL);
	url.search = new URLSearchParams({
		CATNR: satellite.catalogNumber,
		FORMAT: 'tle'
	}).toString();

	const response = await fetch(url, {
		headers: {
			Accept: 'text/plain',
			'User-Agent': CELESTRAK_USER_AGENT
		}
	});

	if (!response.ok) {
		throw new Error(`CelesTrak request failed for ${satellite.catalogNumber}: ${response.status}`);
	}

	const payload = await response.text();
	return parseSingleTlePayload(payload, satellite);
}

function parseSingleTlePayload(
	payload: string,
	satellite: CuratedSatellite
): CelesTrakEntry | null {
	const lines = payload
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter(Boolean);

	const invalidQuery = lines.some((line) => line.startsWith('Invalid query:'));
	if (invalidQuery || lines.length < 2) {
		return null;
	}

	const [maybeName, maybeLine1, maybeLine2] = lines;

	if (maybeLine1?.startsWith('1 ') && maybeLine2?.startsWith('2 ')) {
		return {
			satellite,
			catalogName: maybeName.trim(),
			catalogId: maybeLine1.slice(2, 7).trim(),
			line1: maybeLine1,
			line2: maybeLine2
		};
	}

	if (maybeName?.startsWith('1 ') && maybeLine1?.startsWith('2 ')) {
		return {
			satellite,
			catalogName: satellite.name,
			catalogId: maybeName.slice(2, 7).trim(),
			line1: maybeName,
			line2: maybeLine1
		};
	}

	return null;
}
