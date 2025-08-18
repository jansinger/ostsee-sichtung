import { describe, it, expect } from 'vitest';
import { maskEmail } from './emailMask';

describe('maskEmail', () => {
	it('should mask a typical email address', () => {
		expect(maskEmail('max.mustermann@example.com')).toBe('m***@example.com');
	});

	it('should mask short email addresses', () => {
		expect(maskEmail('a@example.com')).toBe('a@example.com');
	});

	it('should mask longer email addresses', () => {
		expect(maskEmail('verylongemail@example.com')).toBe('v***@example.com');
	});

	it('should handle single character local part', () => {
		expect(maskEmail('x@domain.com')).toBe('x@domain.com');
	});

	it('should limit asterisks to maximum 3', () => {
		const result = maskEmail('verylongemailaddress@example.com');
		expect(result).toBe('v***@example.com');
		expect(result.split('@')[0]).toHaveLength(4); // 1 char + 3 asterisks
	});

	it('should handle empty or null inputs', () => {
		expect(maskEmail('')).toBe('***@***.***');
		expect(maskEmail(null as any)).toBe('***@***.***');
		expect(maskEmail(undefined as any)).toBe('***@***.***');
	});

	it('should handle invalid email formats', () => {
		expect(maskEmail('invalid-email')).toBe('***@***.***');
		expect(maskEmail('@example.com')).toBe('***@***.***');
		expect(maskEmail('user@')).toBe('***@***.***');
		expect(maskEmail('user@@example.com')).toBe('***@***.***');
	});

	it('should handle multiple @ signs', () => {
		expect(maskEmail('user@domain@com')).toBe('***@***.***');
	});

	it('should preserve the full domain', () => {
		expect(maskEmail('user@subdomain.example.com')).toBe('u***@subdomain.example.com');
		expect(maskEmail('test@very.long.domain.name.com')).toBe('t***@very.long.domain.name.com');
	});

	it('should handle different domain extensions', () => {
		expect(maskEmail('user@example.org')).toBe('u***@example.org');
		expect(maskEmail('user@example.co.uk')).toBe('u***@example.co.uk');
		expect(maskEmail('user@example.museum')).toBe('u***@example.museum');
	});

	it('should handle emails with special characters in local part', () => {
		expect(maskEmail('user.name@example.com')).toBe('u***@example.com');
		expect(maskEmail('user+tag@example.com')).toBe('u***@example.com');
		expect(maskEmail('user-name@example.com')).toBe('u***@example.com');
	});

	it('should handle emails with numbers', () => {
		expect(maskEmail('user123@example.com')).toBe('u***@example.com');
		expect(maskEmail('123user@example.com')).toBe('1***@example.com');
	});

	it('should handle very short local parts', () => {
		expect(maskEmail('ab@example.com')).toBe('a*@example.com');
		expect(maskEmail('abc@example.com')).toBe('a**@example.com');
	});

	it('should handle edge case with empty local or domain parts', () => {
		expect(maskEmail('@domain.com')).toBe('***@***.***');
		expect(maskEmail('user@')).toBe('***@***.***');
	});

	it('should be consistent for the same input', () => {
		const email = 'consistent.test@example.com';
		const result1 = maskEmail(email);
		const result2 = maskEmail(email);
		expect(result1).toBe(result2);
		expect(result1).toBe('c***@example.com');
	});
});