/**
 * Health Check Endpoint for Docker Container Monitoring
 *
 * This endpoint provides basic health status information for load balancers,
 * Docker health checks, and monitoring systems (Prometheus, Kubernetes).
 *
 * Returns:
 * - HTTP 200: Service is healthy
 * - HTTP 503: Service is unhealthy (database down, etc.)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const startTime = Date.now();

	// Basic health status
	const health = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		environment: process.env.NODE_ENV || 'unknown',
		version: process.env.npm_package_version || 'unknown'
	};

	// Optional: Check database connectivity
	// Uncomment if you want database health checks
	/*
	try {
		const { db } = await import('$lib/server/db');
		const { sql } = await import('drizzle-orm');

		await db.execute(sql`SELECT 1`);
		health.database = 'connected';
	} catch (error) {
		health.status = 'unhealthy';
		health.database = 'disconnected';
		health.error = error instanceof Error ? error.message : 'Unknown database error';

		const responseTime = Date.now() - startTime;
		return json(
			{ ...health, responseTime: `${responseTime}ms` },
			{ status: 503 }
		);
	}
	*/

	const responseTime = Date.now() - startTime;

	return json(
		{
			...health,
			responseTime: `${responseTime}ms`
		},
		{
			status: 200,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Content-Type': 'application/json'
			}
		}
	);
};

// Also support HEAD requests for minimal health checks
export const HEAD: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Cache-Control': 'no-cache, no-store, must-revalidate'
		}
	});
};
