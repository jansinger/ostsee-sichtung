import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string | null | undefined): string {
	if (!dirty) return '';
	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: ['a', 'em', 'strong', 'br', 'span', 'p', 'i', 'b'],
		ALLOWED_ATTR: ['href', 'class', 'target', 'rel']
	});
}

export function sanitizeText(dirty: string | null | undefined): string {
	if (!dirty) return '';
	return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
