import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitizes HTML allowing a safe subset of tags.
 * Works on both server and client — no DOM/jsdom required.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
	if (!dirty) return '';
	return sanitizeHtmlLib(dirty, {
		allowedTags: ['a', 'em', 'strong', 'br', 'span', 'p', 'i', 'b'],
		allowedAttributes: { a: ['href', 'class', 'target', 'rel'], '*': ['class'] }
	});
}

/**
 * Strips all HTML tags, returning plain text only.
 * Works on both server and client — no DOM/jsdom required.
 */
export function sanitizeText(dirty: string | null | undefined): string {
	if (!dirty) return '';
	return sanitizeHtmlLib(dirty, { allowedTags: [], allowedAttributes: {} });
}
