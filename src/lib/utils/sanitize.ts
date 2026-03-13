import DOMPurify from 'dompurify';

/**
 * Server-side HTML entity encoding fallback.
 * Encodes all HTML special characters so no tags can be interpreted.
 */
function serverEscapeHtml(html: string): string {
	return html
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Sanitizes HTML allowing a safe subset of tags.
 *
 * SSR: returns empty string to avoid hydration mismatch with {@html}.
 * The client will render the sanitized HTML after hydration.
 * Client: uses DOMPurify with allowed tags/attributes.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
	if (!dirty) return '';
	if (typeof window === 'undefined') {
		// SSR: return empty string to prevent hydration mismatch with {@html}
		// Client will re-render with proper DOMPurify sanitization after hydration
		return '';
	}
	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: ['a', 'em', 'strong', 'br', 'span', 'p', 'i', 'b'],
		ALLOWED_ATTR: ['href', 'class', 'target', 'rel']
	});
}

/**
 * Strips all HTML tags, returning plain text only.
 *
 * SSR: HTML-encodes all special characters (safe, no hydration issue
 * since the output is plain text in both cases).
 * Client: uses DOMPurify with no allowed tags.
 */
export function sanitizeText(dirty: string | null | undefined): string {
	if (!dirty) return '';
	if (typeof window === 'undefined') {
		return serverEscapeHtml(dirty);
	}
	return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
