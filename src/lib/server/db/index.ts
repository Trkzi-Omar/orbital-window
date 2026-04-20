import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const DEFAULT_DATABASE_URL = 'file:local.db';
const SUPPORTED_DATABASE_SCHEMES = ['file:', 'libsql:', 'http:', 'https:', 'ws:', 'wss:'];

function resolveDatabaseUrl() {
	const candidates = [env.ORBITAL_WINDOW_DATABASE_URL, env.DATABASE_URL].filter(
		(value): value is string => Boolean(value)
	);

	for (const candidate of candidates) {
		if (SUPPORTED_DATABASE_SCHEMES.some((prefix) => candidate.startsWith(prefix))) {
			return candidate;
		}
	}

	return DEFAULT_DATABASE_URL;
}

const client = createClient({
	url: resolveDatabaseUrl()
});

export const db = drizzle(client, { schema });

let databaseReady: Promise<void> | null = null;

export function ensureDatabase() {
	if (!databaseReady) {
		databaseReady = client
			.execute(
				`
				CREATE TABLE IF NOT EXISTS saved_location (
					id TEXT PRIMARY KEY NOT NULL,
					query TEXT NOT NULL,
					query_normalized TEXT NOT NULL,
					name TEXT NOT NULL,
					lat REAL NOT NULL,
					lon REAL NOT NULL,
					country TEXT,
					display_name TEXT NOT NULL,
					is_pinned INTEGER NOT NULL DEFAULT 0,
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL
				);
			`
			)
			.then(() =>
				client.execute(
					'CREATE UNIQUE INDEX IF NOT EXISTS saved_location_query_normalized_idx ON saved_location(query_normalized);'
				)
			)
			.then(() => undefined);
	}

	return databaseReady;
}
