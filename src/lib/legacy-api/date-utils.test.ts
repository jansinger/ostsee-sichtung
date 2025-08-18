/**
 * @fileoverview Tests for timezone-safe date utilities
 * 
 * Validates consistent UTC-based date/time formatting across different timezones.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { describe, expect, it } from 'vitest';
import { formatDateDDMMYY, formatTimeHHMI, toUnixTimestamp } from './date-utils';

describe('Legacy API Date Utils (Timezone-Safe)', () => {
	describe('formatDateDDMMYY', () => {
		it('should format date in DD.MM.YY format using UTC', () => {
			// Test with known UTC date
			const date = new Date('2012-01-25T14:50:00.000Z');
			const result = formatDateDDMMYY(date);
			
			expect(result).toBe('25.01.12');
		});

		it('should handle different months and years correctly', () => {
			const testCases = [
				{ date: '2024-03-15T09:30:00.000Z', expected: '15.03.24' },
				{ date: '2012-12-31T23:59:59.000Z', expected: '31.12.12' },
				{ date: '2000-02-29T12:00:00.000Z', expected: '29.02.00' },
				{ date: '2023-07-04T00:00:00.000Z', expected: '04.07.23' }
			];

			testCases.forEach(({ date, expected }) => {
				const result = formatDateDDMMYY(new Date(date));
				expect(result).toBe(expected);
			});
		});

		it('should pad single digits with zeros', () => {
			const date = new Date('2024-01-05T12:00:00.000Z');
			const result = formatDateDDMMYY(date);
			
			expect(result).toBe('05.01.24');
		});
	});

	describe('formatTimeHHMI', () => {
		it('should format time in HH:MI format using UTC', () => {
			const date = new Date('2012-01-25T14:50:00.000Z');
			const result = formatTimeHHMI(date);
			
			expect(result).toBe('14:50');
		});

		it('should handle different times correctly', () => {
			const testCases = [
				{ date: '2024-03-15T09:05:00.000Z', expected: '09:05' },
				{ date: '2024-03-15T23:59:00.000Z', expected: '23:59' },
				{ date: '2024-03-15T00:00:00.000Z', expected: '00:00' },
				{ date: '2024-03-15T12:30:45.123Z', expected: '12:30' }
			];

			testCases.forEach(({ date, expected }) => {
				const result = formatTimeHHMI(new Date(date));
				expect(result).toBe(expected);
			});
		});

		it('should pad single digits with zeros', () => {
			const date = new Date('2024-01-01T03:05:00.000Z');
			const result = formatTimeHHMI(date);
			
			expect(result).toBe('03:05');
		});
	});

	describe('toUnixTimestamp', () => {
		it('should convert date to Unix timestamp', () => {
			const date = new Date('2012-01-25T14:50:00.000Z');
			const result = toUnixTimestamp(date);
			
			expect(result).toBe(1327503000);
		});

		it('should handle different dates correctly', () => {
			const testCases = [
				{ date: '1970-01-01T00:00:00.000Z', expected: 0 },
				{ date: '2024-03-15T12:30:00.000Z', expected: 1710505800 },
				{ date: '2000-02-29T23:59:59.000Z', expected: 951868799 }
			];

			testCases.forEach(({ date, expected }) => {
				const result = toUnixTimestamp(new Date(date));
				expect(result).toBe(expected);
			});
		});

		it('should handle milliseconds correctly', () => {
			const date1 = new Date('2024-01-01T12:00:00.000Z');
			const date2 = new Date('2024-01-01T12:00:00.999Z');
			
			// Should be same Unix timestamp (floor operation)
			expect(toUnixTimestamp(date1)).toBe(toUnixTimestamp(date2));
		});
	});

	describe('Timezone consistency', () => {
		it('should produce same results regardless of system timezone', () => {
			// Test with a date that could be affected by timezone conversion
			const utcDate = new Date('2024-03-15T14:30:00.000Z');
			
			// These should always be the same regardless of local timezone
			expect(formatDateDDMMYY(utcDate)).toBe('15.03.24');
			expect(formatTimeHHMI(utcDate)).toBe('14:30');
			expect(toUnixTimestamp(utcDate)).toBe(1710513000);
		});

		it('should handle edge cases around midnight UTC', () => {
			const midnightUTC = new Date('2024-12-31T23:59:59.000Z');
			
			// Should always show UTC values, not local timezone-adjusted
			expect(formatDateDDMMYY(midnightUTC)).toBe('31.12.24');
			expect(formatTimeHHMI(midnightUTC)).toBe('23:59');
		});
	});
});