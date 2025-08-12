import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_POSTGRES_URL) throw new Error('DATABASE_POSTGRES_URL is not set');

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_POSTGRES_URL },
	verbose: true,
	strict: true,
	tablesFilter: [
		'!pg_stat_statements',
		'!pg_stat_statements_info',
		'!spatial_ref_sys',
		'!geography_columns',
		'!geometry_columns'
	]
});
