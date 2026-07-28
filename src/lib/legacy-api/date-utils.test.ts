/**
 * @fileoverview Tests for timezone-safe date utilities
 *
 * `sichtungsdatum` holds true UTC instants; the legacy API renders them in
 * German local time (`Europe/Berlin`). These tests therefore feed UTC instants
 * and expect Berlin wall-clock output — CET (UTC+1) in winter, CEST (UTC+2) in
 * summer. That the migrated historical records still render byte-identically to
 * the pre-migration output is covered separately in `date-utils.timezone.test.ts`.
 *
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { describe, expect, it } from 'vitest';
import { formatDateDDMMYY, formatTimeHHMI, toUnixTimestamp } from './date-utils';

describe('Legacy API Date Utils (Timezone-Safe)', () => {
	describe('formatDateDDMMYY', () => {
		it('should format date in DD.MM.YY format in German local time', () => {
			// 14:50 UTC == 15:50 CET, same calendar day
			const date = new Date('2012-01-25T14:50:00.000Z');
			const result = formatDateDDMMYY(date);

			expect(result).toBe('25.01.12');
		});

		it('should handle different months and years correctly', () => {
			const testCases = [
				{ date: '2024-03-15T09:30:00.000Z', expected: '15.03.24' }, // 10:30 CET
				{ date: '2012-12-31T23:59:59.000Z', expected: '01.01.13' }, // 00:59 CET, next year
				{ date: '2000-02-29T12:00:00.000Z', expected: '29.02.00' }, // 13:00 CET, leap day
				{ date: '2023-07-04T00:00:00.000Z', expected: '04.07.23' } // 02:00 CEST
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
		it('should format time in HH:MI format in German local time', () => {
			// 14:50 UTC + 1h (CET) == 15:50
			const date = new Date('2012-01-25T14:50:00.000Z');
			const result = formatTimeHHMI(date);

			expect(result).toBe('15:50');
		});

		it('should handle different times correctly', () => {
			// Alle im März vor der Zeitumstellung → CET (UTC+1)
			const testCases = [
				{ date: '2024-03-15T09:05:00.000Z', expected: '10:05' },
				{ date: '2024-03-15T23:59:00.000Z', expected: '00:59' }, // rolls into next day
				{ date: '2024-03-15T00:00:00.000Z', expected: '01:00' },
				{ date: '2024-03-15T12:30:45.123Z', expected: '13:30' }
			];

			testCases.forEach(({ date, expected }) => {
				const result = formatTimeHHMI(new Date(date));
				expect(result).toBe(expected);
			});
		});

		it('should pad single digits with zeros', () => {
			const date = new Date('2024-01-01T03:05:00.000Z');
			const result = formatTimeHHMI(date);

			expect(result).toBe('04:05');
		});

		it('should apply the summer offset (CEST, UTC+2)', () => {
			const date = new Date('2024-07-15T12:30:00.000Z');

			expect(formatTimeHHMI(date)).toBe('14:30');
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
			// 14:30 UTC == 15:30 CET (March 15 is before the DST changeover)
			const utcDate = new Date('2024-03-15T14:30:00.000Z');

			expect(formatDateDDMMYY(utcDate)).toBe('15.03.24');
			expect(formatTimeHHMI(utcDate)).toBe('15:30');
			expect(toUnixTimestamp(utcDate)).toBe(1710513000);
		});

		it('should handle edge cases around midnight UTC', () => {
			// 23:59 UTC on New Year's Eve is already 00:59 on New Year's Day in Berlin
			const midnightUTC = new Date('2024-12-31T23:59:59.000Z');

			expect(formatDateDDMMYY(midnightUTC)).toBe('01.01.25');
			expect(formatTimeHHMI(midnightUTC)).toBe('00:59');
		});
	});
});
