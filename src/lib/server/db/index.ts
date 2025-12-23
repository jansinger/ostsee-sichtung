import { env } from '$env/dynamic/private';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if database is configured - don't throw immediately to allow app startup
const DATABASE_URL = env.DATABASE_POSTGRES_URL;

// Track if we have a real database connection
let _realDb: PostgresJsDatabase<typeof schema> | null = null;
let _initError: string | null = null;

// Initialize database if URL is available
if (DATABASE_URL) {
	try {
		const client = postgres(DATABASE_URL);
		_realDb = drizzle(client, { schema });
	} catch (error) {
		_initError = error instanceof Error ? error.message : String(error);
	}
}

// Create a proxy that provides the database or throws a clear error
// This allows TypeScript to treat db as non-null while still handling missing DB gracefully
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
	get(_target, prop) {
		if (!_realDb) {
			const errorMsg = _initError
				? `Database connection failed: ${_initError}`
				: 'Database is not configured. Set DATABASE_POSTGRES_URL environment variable.';
			throw new Error(errorMsg);
		}
		const value = _realDb[prop as keyof typeof _realDb];
		if (typeof value === 'function') {
			return value.bind(_realDb);
		}
		return value;
	}
});

// Helper function to check if database is available (for graceful degradation)
export function isDatabaseAvailable(): boolean {
	return _realDb !== null;
}

// Helper function to get db with proper error if not available
export function getDb(): PostgresJsDatabase<typeof schema> {
	if (!_realDb) {
		const errorMsg = _initError
			? `Database connection failed: ${_initError}`
			: 'Database is not configured. Set DATABASE_POSTGRES_URL environment variable.';
		throw new Error(errorMsg);
	}
	return _realDb;
}
