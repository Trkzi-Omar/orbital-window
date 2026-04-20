export type CuratedSatellite = {
	id: string;
	catalogNumber: string;
	name: string;
	tagline: string;
	description: string;
	group: 'station' | 'science' | 'weather' | 'earth';
	theme: {
		accent: string;
		glow: string;
	};
};

export type LocationSearchResult = {
	id: string;
	query: string;
	name: string;
	lat: number;
	lon: number;
	country: string | null;
	displayName: string;
	timezone: string | null;
};

export type WeatherPoint = {
	time: string;
	cloudCover: number;
};

export type SunWindow = {
	date: string;
	sunrise: string;
	sunset: string;
};

export type WeatherSummary = {
	timezone: string;
	sunrise: string | null;
	sunset: string | null;
	hourlyCloudCover: WeatherPoint[];
	sunWindows: SunWindow[];
};

export type OrbitPoint = {
	lat: number;
	lon: number;
	altitudeKm: number | null;
	timestamp: string;
};

export type OverheadPass = {
	id: string;
	satelliteId: string;
	startTime: string;
	peakTime: string;
	endTime: string;
	durationMinutes: number;
	maxElevationDeg: number;
	startBearing: string;
	endBearing: string;
	nightWindow: boolean;
	cloudCoverAtPeak: number | null;
	visibilityScore: number;
};

export type SatelliteSnapshot = {
	satellite: CuratedSatellite;
	catalogName: string;
	catalogId: string;
	epoch: string;
	orbitTrack: OrbitPoint[];
	nextPasses: OverheadPass[];
	currentAltitudeKm: number | null;
	currentVelocityKps: number | null;
};

export type SavedLocationRecord = {
	id: string;
	name: string;
	query: string;
	lat: number;
	lon: number;
	country: string | null;
	displayName: string;
	isPinned: boolean;
	createdAt: string;
};

export type DashboardPayload = {
	location: LocationSearchResult | null;
	weather: WeatherSummary | null;
	snapshots: SatelliteSnapshot[];
	savedLocations: SavedLocationRecord[];
	lastUpdated: string | null;
};
