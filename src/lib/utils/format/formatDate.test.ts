import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
	it('should format a valid Date object', () => {
		const date = new Date('2024-03-15T14:30:00.000Z');
		const result = formatDate(date);
		// Result will vary based on timezone, but should contain date components
		expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
	});

	it('should format a valid date string', () => {
		const dateString = '2024-03-15T14:30:00';
		const result = formatDate(dateString);
		expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
	});

	it('should handle null input', () => {
		const result = formatDate(null);
		expect(result).toBe('Nicht angegeben');
	});

	it('should handle undefined input', () => {
		const result = formatDate(undefined as any);
		expect(result).toBe('Nicht angegeben');
	});

	it('should handle empty string input', () => {
		const result = formatDate('');
		expect(result).toBe('Nicht angegeben');
	});

	it('should format ISO date string correctly', () => {
		const isoString = '2024-12-25T00:00:00.000Z';
		const result = formatDate(isoString);
		expect(result).toMatch(/25\.12\.2024/);
	});

	it('should handle various date formats', () => {
		const formats = [
			'2024-03-15',
			'2024/03/15',
			'March 15, 2024',
			'03/15/2024'
		];
		
		formats.forEach(format => {
			const result = formatDate(format);
			expect(result).not.toBe('Nicht angegeben');
			expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
		});
	});

	it('should format specific date consistently', () => {
		// Test with a fixed date to ensure consistent formatting
		const date = new Date('2024-01-15T09:30:00.000Z');
		const result = formatDate(date);
		expect(result).toMatch(/15\.01\.2024/);
		expect(result).toMatch(/\d{2}:\d{2}/);
	});

	it('should handle leap year dates', () => {
		const leapDate = new Date('2024-02-29T12:00:00.000Z');
		const result = formatDate(leapDate);
		expect(result).toMatch(/29\.02\.2024/);
	});

	it('should format beginning and end of year', () => {
		const newYear = formatDate('2024-01-01T12:00:00.000Z');
		const endYear = formatDate('2024-12-31T12:00:00.000Z');
		
		expect(newYear).toMatch(/01\.01\.2024/);
		expect(endYear).toMatch(/31\.12\.2024/);
	});
});