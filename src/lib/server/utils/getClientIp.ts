/**
 * Safely retrieves the client IP address from a SvelteKit request event.
 * Falls back to 'unknown' when the adapter does not support client address
 * resolution (e.g. dev mode, certain proxy setups).
 */
export function getClientIp(getClientAddress: () => string): string {
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}
