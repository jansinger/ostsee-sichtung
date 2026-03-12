import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText } from '$lib/utils/sanitize';

describe('sanitizeHtml', () => {
	it('preserves safe tags', () => {
		const input = '<a href="https://example.com">link</a> <em>emphasis</em> <strong>bold</strong> <br>';
		const result = sanitizeHtml(input);
		expect(result).toContain('<a href="https://example.com">link</a>');
		expect(result).toContain('<em>emphasis</em>');
		expect(result).toContain('<strong>bold</strong>');
		expect(result).toContain('<br>');
	});

	it('strips script tags', () => {
		const result = sanitizeHtml('<script>alert("xss")</script>Safe text');
		expect(result).not.toContain('<script>');
		expect(result).toContain('Safe text');
	});

	it('strips event handlers', () => {
		const result = sanitizeHtml('<a href="#" onclick="alert(1)">click</a>');
		expect(result).not.toContain('onclick');
		expect(result).toContain('<a href="#">click</a>');
	});

	it('strips javascript: URLs', () => {
		const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
		expect(result).not.toContain('javascript:');
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

	it('preserves copyright HTML patterns from SpeciesIdentificationHelp', () => {
		const copyright =
			'© <a href="https://commons.wikimedia.org/wiki/File:Example.jpg">Author</a>, <a href="http://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>, via Wikimedia Commons';
		const result = sanitizeHtml(copyright);
		expect(result).toContain('<a href="https://commons.wikimedia.org/wiki/File:Example.jpg">Author</a>');
		expect(result).toContain('<a href="http://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>');
		expect(result).toContain('via Wikimedia Commons');
	});

	it('strips dangerous tags like iframe', () => {
		const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
		expect(result).not.toContain('<iframe');
	});

	it('preserves span and p tags', () => {
		const result = sanitizeHtml('<span class="highlight">text</span><p>paragraph</p>');
		expect(result).toContain('<span class="highlight">text</span>');
		expect(result).toContain('<p>paragraph</p>');
	});
});

describe('sanitizeText', () => {
	it('strips ALL HTML tags', () => {
		const result = sanitizeText('<b>bold</b> and <a href="#">link</a>');
		expect(result).toBe('bold and link');
	});

	it('returns plain text', () => {
		const result = sanitizeText('plain text');
		expect(result).toBe('plain text');
	});

	it('returns empty string for null', () => {
		expect(sanitizeText(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(sanitizeText(undefined)).toBe('');
	});

	it('strips script tags and their content', () => {
		const result = sanitizeText('<script>alert("xss")</script>Safe');
		expect(result).not.toContain('alert');
		expect(result).toContain('Safe');
	});
});
