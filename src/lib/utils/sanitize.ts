import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML allowing a safe subset of tags.
 * Works on both server (SSR via jsdom) and client.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
	if (!dirty) return '';
	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: ['a', 'em', 'strong', 'br', 'span', 'p', 'i', 'b'],
		ALLOWED_ATTR: ['href', 'class', 'target', 'rel']
	});
}

/**
 * Strips all HTML tags, returning plain text only.
 * Works on both server (SSR via jsdom) and client.
 */
export function sanitizeText(dirty: string | null | undefined): string {
	if (!dirty) return '';
	return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
