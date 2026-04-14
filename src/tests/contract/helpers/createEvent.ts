import { vi } from 'vitest';

type EventOptions = {
	params?: Record<string, string>;
	searchParams?: Record<string, string>;
	body?: unknown;
	locals?: { user: unknown };
	method?: string;
};

/**
 * Creates a SvelteKit RequestEvent-like mock object for directly invoking route handlers.
 * Follows the same pattern as createMockRequestEvent() in the existing endpoint.test.ts files.
 */
export function createEvent(urlPath: string, options: EventOptions = {}) {
	const url = new URL(`http://localhost${urlPath}`);
	if (options.searchParams) {
		for (const [k, v] of Object.entries(options.searchParams)) {
			url.searchParams.set(k, v);
		}
	}

	const method = options.method ?? 'GET';

	return {
		params: options.params ?? {},
		url,
		locals: options.locals ?? { user: null },
		request: new Request(url, {
			method,
			body: options.body != null ? JSON.stringify(options.body) : null,
			headers: options.body != null ? { 'Content-Type': 'application/json' } : {}
		}),
		cookies: {} as any,
		fetch,
		getClientAddress: () => '127.0.0.1',
		platform: undefined,
		route: { id: urlPath },
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false,
		isRemoteRequest: false
	} as any;
}

/** Prebuilt mock user fixtures */
export const mockAdminUser = { sub: 'u-1', email: 'admin@test.de', roles: ['admin'] };
export const mockSuperadmin = { sub: 'u-2', email: 'super@test.de', roles: ['superadmin'] };
