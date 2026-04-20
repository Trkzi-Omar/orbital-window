import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { DEFAULT_LOCATION_QUERY } from '$lib/server/catalog';
import { getCuratedSatelliteElements } from '$lib/server/celestrak';
import { ensureDatabase } from '$lib/server/db';
import {
	deleteSavedLocation,
	getPreferredSavedLocation,
	getSavedLocationById,
	listSavedLocations,
	searchLocation,
	toggleSavedLocationPin
} from '$lib/server/nominatim';
import { buildSatelliteSnapshots } from '$lib/server/orbit';
import { createFallbackWeatherContext, getWeatherContext } from '$lib/server/weather';
import type { DashboardPayload, LocationSearchResult, SatelliteSnapshot } from '$lib/types/orbital';

const QUERY_PARAM = 'query';
const SAVED_LOCATION_PARAM = 'saved';
const RETURN_QUERY_FIELD = 'returnQuery';
const RETURN_SAVED_FIELD = 'returnSaved';
const LOCATION_ID_FIELD = 'locationId';

type SearchState = {
	query: string;
	savedLocationId: string | null;
	error: string | null;
	pending: false;
};

type ResolvedLocation = {
	location: LocationSearchResult | null;
	search: SearchState;
};

export const load: PageServerLoad = async ({ depends, url }) => {
	depends('orbital:dashboard');
	await ensureDatabase();

	const resolved = await resolveRequestedLocation(url);
	const dashboard = await buildDashboard(resolved.location);

	return {
		dashboard,
		savedLocations: dashboard.savedLocations,
		search: resolved.search
	};
};

export const actions: Actions = {
	async togglePin({ request, url }) {
		await ensureDatabase();

		const formData = await request.formData();
		const locationId = formData.get(LOCATION_ID_FIELD)?.toString().trim();
		if (!locationId) {
			return fail(400, {
				error: 'Missing saved location id.'
			});
		}

		const updated = await toggleSavedLocationPin(locationId);
		if (!updated) {
			return fail(404, {
				error: 'Saved location not found.'
			});
		}

		throw redirect(303, buildReturnUrl(url, formData, updated.id));
	},

	async deleteLocation({ request, url }) {
		await ensureDatabase();

		const formData = await request.formData();
		const locationId = formData.get(LOCATION_ID_FIELD)?.toString().trim();
		if (!locationId) {
			return fail(400, {
				error: 'Missing saved location id.'
			});
		}

		const deletedLocation = await getSavedLocationById(locationId);
		const deleted = await deleteSavedLocation(locationId);
		if (!deleted) {
			return fail(404, {
				error: 'Saved location not found.'
			});
		}

		const returnSaved = formData.get(RETURN_SAVED_FIELD)?.toString().trim();
		const nextSavedId = returnSaved === locationId ? null : returnSaved || null;
		const shouldClearReturnQuery =
			returnSaved === locationId &&
			deletedLocation &&
			normalizeQuery(formData.get(RETURN_QUERY_FIELD)?.toString().trim() ?? '') ===
				normalizeQuery(deletedLocation.query);

		throw redirect(
			303,
			buildReturnUrl(url, formData, nextSavedId, shouldClearReturnQuery ? '' : undefined)
		);
	}
};

async function resolveRequestedLocation(url: URL): Promise<ResolvedLocation> {
	const requestedQuery = url.searchParams.get(QUERY_PARAM)?.trim() ?? '';
	const requestedSavedLocationId = url.searchParams.get(SAVED_LOCATION_PARAM)?.trim() || null;

	const baseSearch: SearchState = {
		query: requestedQuery,
		savedLocationId: requestedSavedLocationId,
		error: null,
		pending: false
	};

	try {
		if (requestedSavedLocationId) {
			const savedLocation = await getSavedLocationById(requestedSavedLocationId);
			if (savedLocation && shouldUseSavedLocation(savedLocation, requestedQuery)) {
				return {
					location: savedLocation,
					search: {
						...baseSearch,
						query: savedLocation.query,
						savedLocationId: savedLocation.id
					}
				};
			}

			if (!savedLocation && !requestedQuery) {
				const fallback = await resolveFallbackLocation();
				return {
					location: fallback,
					search: {
						...baseSearch,
						query: fallback?.query ?? requestedQuery,
						savedLocationId: fallback && isPersistedLocation(fallback) ? fallback.id : null,
						error: 'Saved location not found. Showing the default board.'
					}
				};
			}
		}

		if (requestedQuery) {
			const searchedLocation = await searchLocation(requestedQuery, { persist: true });
			if (searchedLocation) {
				return {
					location: searchedLocation,
					search: {
						...baseSearch,
						query: searchedLocation.query,
						savedLocationId: isPersistedLocation(searchedLocation) ? searchedLocation.id : null
					}
				};
			}

			const fallback = await resolveFallbackLocation();
			return {
				location: fallback,
				search: {
					...baseSearch,
					query: requestedQuery,
					savedLocationId: fallback && isPersistedLocation(fallback) ? fallback.id : null,
					error: 'No matching location found. Showing the current default board.'
				}
			};
		}

		const fallback = await resolveFallbackLocation();
		return {
			location: fallback,
			search: {
				...baseSearch,
				query: fallback?.query ?? DEFAULT_LOCATION_QUERY,
				savedLocationId: fallback && isPersistedLocation(fallback) ? fallback.id : null
			}
		};
	} catch (error) {
		console.error('Failed to resolve homepage location', error);

		const fallback = await resolveFallbackLocation().catch(() => null);
		return {
			location: fallback,
			search: {
				...baseSearch,
				query: requestedQuery || fallback?.query || DEFAULT_LOCATION_QUERY,
				savedLocationId: fallback && isPersistedLocation(fallback) ? fallback.id : null,
				error: 'Location search is temporarily unavailable. Showing cached data when possible.'
			}
		};
	}
}

async function resolveFallbackLocation() {
	return (await getPreferredSavedLocation()) ?? (await searchLocation(DEFAULT_LOCATION_QUERY));
}

async function buildDashboard(location: LocationSearchResult | null): Promise<DashboardPayload> {
	const savedLocations = await listSavedLocations();

	if (!location) {
		return {
			location: null,
			weather: null,
			snapshots: [],
			savedLocations,
			lastUpdated: null
		};
	}

	const lastUpdated = new Date().toISOString();
	const [weatherResult, catalogResult] = await Promise.allSettled([
		getWeatherContext(location),
		getCuratedSatelliteElements()
	]);

	const weatherContext =
		weatherResult.status === 'fulfilled'
			? weatherResult.value
			: createFallbackWeatherContext(location.timezone);
	const resolvedLocation =
		weatherResult.status === 'fulfilled'
			? {
					...location,
					timezone: weatherContext.summary.timezone
				}
			: location;
	const snapshots =
		catalogResult.status === 'fulfilled'
			? sortSnapshots(
					buildSatelliteSnapshots(
						resolvedLocation,
						weatherContext,
						catalogResult.value,
						new Date(lastUpdated)
					)
				)
			: [];

	if (weatherResult.status === 'rejected') {
		console.error('Weather feed unavailable for homepage dashboard', weatherResult.reason);
	}

	if (catalogResult.status === 'rejected') {
		console.error('CelesTrak feed unavailable for homepage dashboard', catalogResult.reason);
	}

	return {
		location: resolvedLocation,
		weather: weatherContext.summary,
		snapshots,
		savedLocations,
		lastUpdated
	};
}

function shouldUseSavedLocation(savedLocation: LocationSearchResult, requestedQuery: string) {
	if (!requestedQuery) {
		return true;
	}

	return normalizeQuery(requestedQuery) === normalizeQuery(savedLocation.query);
}

function normalizeQuery(value: string) {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isPersistedLocation(location: LocationSearchResult) {
	return !location.id.startsWith('nominatim:');
}

function sortSnapshots(snapshots: SatelliteSnapshot[]) {
	return [...snapshots].sort((left, right) => {
		const leftBestPass = left.nextPasses[0];
		const rightBestPass = right.nextPasses[0];

		if (!leftBestPass && !rightBestPass) {
			return left.satellite.name.localeCompare(right.satellite.name);
		}

		if (!leftBestPass) {
			return 1;
		}

		if (!rightBestPass) {
			return -1;
		}

		if (leftBestPass.visibilityScore !== rightBestPass.visibilityScore) {
			return rightBestPass.visibilityScore - leftBestPass.visibilityScore;
		}

		return new Date(leftBestPass.startTime).getTime() - new Date(rightBestPass.startTime).getTime();
	});
}

function buildReturnUrl(
	url: URL,
	formData: FormData,
	savedLocationId: string | null,
	returnQueryOverride?: string
) {
	const nextUrl = new URL(url);
	const returnQuery = returnQueryOverride ?? formData.get(RETURN_QUERY_FIELD)?.toString().trim();

	nextUrl.searchParams.delete(QUERY_PARAM);
	nextUrl.searchParams.delete(SAVED_LOCATION_PARAM);

	if (returnQuery) {
		nextUrl.searchParams.set(QUERY_PARAM, returnQuery);
	}

	if (savedLocationId) {
		nextUrl.searchParams.set(SAVED_LOCATION_PARAM, savedLocationId);
	}

	return `${nextUrl.pathname}${nextUrl.search}`;
}
