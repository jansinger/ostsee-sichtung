import { dev } from '$app/environment';
import pino from 'pino';

export const createClientLogger = (context: string) => {
	// In development mode, ensure debug logs are visible
	const level = dev ? 'debug' : 'info';

	return pino({
		level,
		base: { context },
		browser: {
			asObject: true
		}
	});
};
