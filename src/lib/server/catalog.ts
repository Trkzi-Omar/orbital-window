import type { CuratedSatellite } from '$lib/types/orbital';

export const CURATED_SATELLITES: CuratedSatellite[] = [
	{
		id: 'iss',
		catalogNumber: '25544',
		name: 'ISS',
		tagline: 'Human presence in low Earth orbit',
		description:
			'The International Space Station is the easiest crewed object to explain to non-space people and usually the one they most want to spot.',
		group: 'station',
		theme: {
			accent: '#f97316',
			glow: 'rgba(249, 115, 22, 0.28)'
		}
	},
	{
		id: 'tiangong',
		catalogNumber: '48274',
		name: 'Tiangong',
		tagline: 'China’s modular space station',
		description:
			'A second crewed station makes the dashboard instantly more interesting and gives people another object to compare against ISS passes.',
		group: 'station',
		theme: {
			accent: '#22c55e',
			glow: 'rgba(34, 197, 94, 0.26)'
		}
	},
	{
		id: 'hubble',
		catalogNumber: '20580',
		name: 'Hubble',
		tagline: 'A telescope people already know by name',
		description:
			'Hubble adds a science-forward object that feels recognizable even to users who are not deep into orbital mechanics.',
		group: 'science',
		theme: {
			accent: '#60a5fa',
			glow: 'rgba(96, 165, 250, 0.26)'
		}
	},
	{
		id: 'noaa-19',
		catalogNumber: '33591',
		name: 'NOAA-19',
		tagline: 'A weather satellite with a concrete purpose',
		description:
			'NOAA-19 helps connect observation, weather, and Earth data in a way that makes the app feel practical instead of purely decorative.',
		group: 'weather',
		theme: {
			accent: '#eab308',
			glow: 'rgba(234, 179, 8, 0.25)'
		}
	},
	{
		id: 'landsat-8',
		catalogNumber: '39084',
		name: 'Landsat 8',
		tagline: 'Earth imaging from orbit',
		description:
			'Landsat gives the set an Earth-observation angle and broadens the story beyond stations and telescopes.',
		group: 'earth',
		theme: {
			accent: '#a855f7',
			glow: 'rgba(168, 85, 247, 0.25)'
		}
	}
];

export const DEFAULT_LOCATION_QUERY = 'Casablanca, Morocco';
