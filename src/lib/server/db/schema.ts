import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const savedLocations = sqliteTable(
	'saved_location',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		query: text('query').notNull(),
		queryNormalized: text('query_normalized').notNull(),
		name: text('name').notNull(),
		lat: real('lat').notNull(),
		lon: real('lon').notNull(),
		country: text('country'),
		displayName: text('display_name').notNull(),
		isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
		createdAt: text('created_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		updatedAt: text('updated_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString())
	},
	(table) => [uniqueIndex('saved_location_query_normalized_idx').on(table.queryNormalized)]
);
