import * as satellite from 'satellite.js';
import type { SatRec } from 'satellite.js';

import type { CelesTrakEntry } from '$lib/server/celestrak';
import type { WeatherContext } from '$lib/server/weather';
import type {
	LocationSearchResult,
	OrbitPoint,
	OverheadPass,
	SatelliteSnapshot
} from '$lib/types/orbital';

const PASS_LOOKAHEAD_MINUTES = 24 * 60;
const PASS_SAMPLE_STEP_MINUTES = 1;
const TRACK_DURATION_MINUTES = 180;
const TRACK_SAMPLE_STEP_MINUTES = 4;
const MIN_VISIBLE_ELEVATION_DEG = 10;

type SatelliteSample = {
	timestamp: Date;
	orbitPoint: OrbitPoint;
	altitudeKm: number;
	velocityKps: number;
	elevationDeg: number;
	azimuthDeg: number;
};

type InProgressPass = {
	samples: SatelliteSample[];
	start: SatelliteSample;
	peak: SatelliteSample;
};

export function buildSatelliteSnapshots(
	location: LocationSearchResult,
	weather: WeatherContext,
	entries: CelesTrakEntry[],
	now = new Date()
): SatelliteSnapshot[] {
	return entries.map((entry) => buildSatelliteSnapshot(entry, location, weather, now));
}

function buildSatelliteSnapshot(
	entry: CelesTrakEntry,
	location: LocationSearchResult,
	weather: WeatherContext,
	now: Date
): SatelliteSnapshot {
	const satrec = satellite.twoline2satrec(entry.line1, entry.line2);
	const observer = {
		latitude: satellite.degreesToRadians(location.lat),
		longitude: satellite.degreesToRadians(location.lon),
		height: 0
	};
	const currentSample = sampleSatellite(satrec, observer, now);

	return {
		satellite: entry.satellite,
		catalogName: entry.catalogName,
		catalogId: entry.catalogId,
		epoch: toEpochIso(satrec.jdsatepoch),
		orbitTrack: buildOrbitTrack(satrec, observer, now),
		nextPasses: buildPasses(entry.satellite.id, satrec, observer, weather, now),
		currentAltitudeKm: currentSample?.altitudeKm ?? null,
		currentVelocityKps: currentSample?.velocityKps ?? null
	};
}

function buildOrbitTrack(satrec: SatRec, observer: ObserverLocation, now: Date): OrbitPoint[] {
	const points: OrbitPoint[] = [];

	for (
		let offsetMinutes = 0;
		offsetMinutes <= TRACK_DURATION_MINUTES;
		offsetMinutes += TRACK_SAMPLE_STEP_MINUTES
	) {
		const sampleTime = new Date(now.getTime() + offsetMinutes * 60_000);
		const sample = sampleSatellite(satrec, observer, sampleTime);
		if (sample) {
			points.push(sample.orbitPoint);
		}
	}

	return points;
}

function buildPasses(
	satelliteId: string,
	satrec: SatRec,
	observer: ObserverLocation,
	weather: WeatherContext,
	now: Date
): OverheadPass[] {
	const passes: OverheadPass[] = [];
	let activePass: InProgressPass | null = null;

	// MVP assumption: sample the next 24h at one-minute resolution and treat
	// contiguous windows above 10 degrees elevation as a single visible pass.
	for (
		let offsetMinutes = 0;
		offsetMinutes <= PASS_LOOKAHEAD_MINUTES;
		offsetMinutes += PASS_SAMPLE_STEP_MINUTES
	) {
		const sampleTime = new Date(now.getTime() + offsetMinutes * 60_000);
		const sample = sampleSatellite(satrec, observer, sampleTime);
		if (!sample) {
			if (activePass) {
				passes.push(finalizePass(satelliteId, activePass, weather));
				activePass = null;
			}
			continue;
		}

		if (sample.elevationDeg >= MIN_VISIBLE_ELEVATION_DEG) {
			if (!activePass) {
				activePass = {
					samples: [sample],
					start: sample,
					peak: sample
				};
			} else {
				activePass.samples.push(sample);
				if (sample.elevationDeg > activePass.peak.elevationDeg) {
					activePass.peak = sample;
				}
			}

			continue;
		}

		if (activePass) {
			passes.push(finalizePass(satelliteId, activePass, weather));
			activePass = null;
		}
	}

	if (activePass) {
		passes.push(finalizePass(satelliteId, activePass, weather));
	}

	return passes.slice(0, 4);
}

function finalizePass(
	satelliteId: string,
	pass: InProgressPass,
	weather: WeatherContext
): OverheadPass {
	const endSample = pass.samples[pass.samples.length - 1];
	const durationMinutes = Math.max(
		1,
		Math.round((endSample.timestamp.getTime() - pass.start.timestamp.getTime()) / 60_000)
	);
	const nightWindow = weather.isNightAt(pass.peak.timestamp);
	const cloudCoverAtPeak = weather.cloudCoverAt(pass.peak.timestamp);

	return {
		id: `${satelliteId}-${pass.start.timestamp.toISOString()}`,
		satelliteId,
		startTime: pass.start.timestamp.toISOString(),
		peakTime: pass.peak.timestamp.toISOString(),
		endTime: endSample.timestamp.toISOString(),
		durationMinutes,
		maxElevationDeg: round(pass.peak.elevationDeg, 1),
		startBearing: toCompass(pass.start.azimuthDeg),
		endBearing: toCompass(endSample.azimuthDeg),
		nightWindow,
		cloudCoverAtPeak,
		visibilityScore: computeVisibilityScore(
			pass.peak.elevationDeg,
			durationMinutes,
			nightWindow,
			cloudCoverAtPeak
		)
	};
}

function sampleSatellite(
	satrec: SatRec,
	observer: ObserverLocation,
	timestamp: Date
): SatelliteSample | null {
	const propagated = satellite.propagate(satrec, timestamp);
	if (!propagated.position || !propagated.velocity) {
		return null;
	}

	const gmst = satellite.gstime(timestamp);
	const geodetic = satellite.eciToGeodetic(propagated.position, gmst);
	const positionEcf = satellite.eciToEcf(propagated.position, gmst);
	const lookAngles = satellite.ecfToLookAngles(observer, positionEcf);

	const altitudeKm = geodetic.height;
	const velocityKps = Math.sqrt(
		propagated.velocity.x ** 2 + propagated.velocity.y ** 2 + propagated.velocity.z ** 2
	);

	return {
		timestamp,
		orbitPoint: {
			lat: round(satellite.degreesLat(geodetic.latitude), 3),
			lon: round(satellite.degreesLong(geodetic.longitude), 3),
			altitudeKm: round(altitudeKm, 2),
			timestamp: timestamp.toISOString()
		},
		altitudeKm: round(altitudeKm, 2),
		velocityKps: round(velocityKps, 3),
		elevationDeg: satellite.radiansToDegrees(lookAngles.elevation),
		azimuthDeg: satellite.radiansToDegrees(lookAngles.azimuth)
	};
}

function computeVisibilityScore(
	maxElevationDeg: number,
	durationMinutes: number,
	nightWindow: boolean,
	cloudCoverAtPeak: number | null
) {
	const elevationScore = Math.min(55, (Math.max(maxElevationDeg, 0) / 90) * 55);
	const durationScore = Math.min(15, durationMinutes * 1.5);
	const nightScore = nightWindow ? 20 : 5;
	const cloudPenalty =
		cloudCoverAtPeak === null ? 0 : Math.min(30, (Math.max(cloudCoverAtPeak, 0) / 100) * 30);

	return Math.max(
		0,
		Math.min(100, Math.round(elevationScore + durationScore + nightScore - cloudPenalty))
	);
}

function toCompass(degrees: number) {
	const points = [
		'N',
		'NNE',
		'NE',
		'ENE',
		'E',
		'ESE',
		'SE',
		'SSE',
		'S',
		'SSW',
		'SW',
		'WSW',
		'W',
		'WNW',
		'NW',
		'NNW'
	];
	const normalized = ((degrees % 360) + 360) % 360;
	const index = Math.round(normalized / 22.5) % points.length;
	return points[index];
}

function toEpochIso(julianDate: number) {
	const epoch = satellite.invjday(julianDate);
	return epoch.toISOString();
}

function round(value: number, precision: number) {
	const multiplier = 10 ** precision;
	return Math.round(value * multiplier) / multiplier;
}

type ObserverLocation = {
	latitude: number;
	longitude: number;
	height: number;
};
