/**
 * Safely retrieves the client IP address from a SvelteKit request event.
 * Falls back to the first entry of the X-Forwarded-For header when the adapter
 * does not support client address resolution (e.g. dev mode, certain proxy setups).
 * Returns null if no address can be determined (e.g. dev mode without X-Forwarded-For).
 * Callers must handle null — do not store null as a placeholder IP value.
 *
 * Note: X-Forwarded-For can be spoofed by clients not behind a trusted proxy.
 * This fallback is only reached when the adapter itself cannot determine the address,
 * which in practice means development mode — not production.
 */
export function getClientIp(getClientAddress: () => string, request?: Request): string | null {
	try {
		return getClientAddress();
	} catch {
		const xff = request?.headers.get('x-forwarded-for');
		if (xff) {
			const first = xff.split(',').at(0)?.trim();
			if (first) return first;
		}
		return null;
	}
}
