import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText } from '$lib/utils/sanitize';

/**
 * Tests run in a server environment (no window/DOM).
 * sanitizeHtml returns empty string on server (avoids {@html} hydration mismatch).
 * sanitizeText uses HTML entity encoding on server.
 * Client-side DOMPurify behavior is not covered here (would require browser environment).
 */

describe('sanitizeHtml (server fallback — empty string for SSR)', () => {
	it('returns empty string on server to avoid hydration mismatch', () => {
		const input = '<a href="https://example.com">link</a> <em>emphasis</em>';
		expect(sanitizeHtml(input)).toBe('');
	});

	it('returns empty string for script tags on server', () => {
		expect(sanitizeHtml('<script>alert("xss")</script>Safe text')).toBe('');
	});

	it('returns empty string for null', () => {
		expect(sanitizeHtml(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(sanitizeHtml(undefined)).toBe('');
	});

	it('returns empty string for empty string', () => {
		expect(sanitizeHtml('')).toBe('');
	});
});

describe('sanitizeText (server fallback — HTML entity encoding)', () => {
	it('encodes ALL HTML tags', () => {
		const result = sanitizeText('<b>bold</b> and <a href="#">link</a>');
		expect(result).not.toContain('<b>');
		expect(result).not.toContain('<a');
		expect(result).toContain('bold');
		expect(result).toContain('link');
	});

	it('returns plain text unchanged', () => {
		expect(sanitizeText('plain text')).toBe('plain text');
	});

	it('returns empty string for null', () => {
		expect(sanitizeText(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(sanitizeText(undefined)).toBe('');
	});

	it('encodes script tags making them harmless', () => {
		const result = sanitizeText('<script>alert("xss")</script>Safe');
		expect(result).not.toContain('<script>');
		expect(result).toContain('Safe');
	});
});

describe('sanitizeText - map popup XSS scenarios (server fallback)', () => {
	it('encodes script injection from shipname field', () => {
		const result = sanitizeText('<script>alert("xss")</script>MS Stralsund');
		expect(result).not.toContain('<script>');
		expect(result).toContain('MS Stralsund');
	});

	it('encodes img onerror payload from waterway field', () => {
		const result = sanitizeText('<img src=x onerror=alert(1)>Kieler Förde');
		expect(result).not.toContain('<img');
		expect(result).toContain('&lt;img');
		expect(result).toContain('Kieler Förde');
	});

	it('encodes svg onload payload', () => {
		const result = sanitizeText('<svg onload=alert(1)>evil</svg>Klaus');
		expect(result).not.toContain('<svg');
		expect(result).toContain('&lt;svg');
		expect(result).toContain('Klaus');
	});

	it('preserves normal Unicode names', () => {
		expect(sanitizeText('Jörg Müller-Ström')).toBe('Jörg Müller-Ström');
	});

	it('handles empty shipname gracefully', () => {
		expect(sanitizeText('')).toBe('');
		expect(sanitizeText(null)).toBe('');
		expect(sanitizeText(undefined)).toBe('');
	});
});
