/**
 * Converts a Web API Response (returned by SvelteKit handlers) into the
 * superagent-like shape expected by vitest-openapi's toSatisfyApiSpec() matcher.
 *
 * The matcher needs:
 *   - status:  HTTP status code (number)
 *   - body:    parsed JSON body (object/array/null)
 *   - text:    raw body text (empty string signals "no body")
 *   - req:     { method: string (uppercase), path: string (pathname) }
 */
export async function asApiResponse(
	res: Response,
	event: { url: URL; request: { method: string } }
) {
	const contentType = res.headers.get('content-type') ?? '';
	let body: unknown = null;
	let text = '';

	if (res.status !== 204) {
		text = await res.clone().text();
		if (contentType.includes('application/json')) {
			try {
				body = JSON.parse(text);
			} catch {
				body = null;
			}
		} else {
			// For non-JSON responses (CSV, XML, KML, …) vitest-openapi validates against
			// `body`, not `text`. Set body to the raw string so `type: string` schemas pass.
			body = text;
		}
	}

	return {
		status: res.status,
		body,
		text,
		req: {
			method: event.request.method.toUpperCase(),
			path: event.url.pathname
		}
	};
}
