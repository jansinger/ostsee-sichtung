import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDefaultSightingYear, isInTransitionPeriod, getAvailableYears } from './defaultYear';

describe('defaultYear utilities', () => {
	describe('getDefaultSightingYear', () => {
		beforeEach(() => {
			// Mock Date
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return previous year in January', () => {
			vi.setSystemTime(new Date('2024-01-15'));
			expect(getDefaultSightingYear()).toBe(2023);
		});

		it('should return previous year in February', () => {
			vi.setSystemTime(new Date('2024-02-28'));
			expect(getDefaultSightingYear()).toBe(2023);
		});

		it('should return previous year in March', () => {
			vi.setSystemTime(new Date('2024-03-31'));
			expect(getDefaultSightingYear()).toBe(2023);
		});

		it('should return current year in April', () => {
			vi.setSystemTime(new Date('2024-04-01'));
			expect(getDefaultSightingYear()).toBe(2024);
		});

		it('should return current year in December', () => {
			vi.setSystemTime(new Date('2024-12-31'));
			expect(getDefaultSightingYear()).toBe(2024);
		});

		it('should return current year in July', () => {
			vi.setSystemTime(new Date('2024-07-15'));
			expect(getDefaultSightingYear()).toBe(2024);
		});

		it('should handle year boundaries correctly', () => {
			// Test at the very beginning of January
			vi.setSystemTime(new Date('2025-01-01T00:00:00'));
			expect(getDefaultSightingYear()).toBe(2024);
			
			// Test at the very end of March
			vi.setSystemTime(new Date('2025-03-31T23:59:59'));
			expect(getDefaultSightingYear()).toBe(2024);
			
			// Test at the very beginning of April
			vi.setSystemTime(new Date('2025-04-01T00:00:00'));
			expect(getDefaultSightingYear()).toBe(2025);
		});
	});

	describe('isInTransitionPeriod', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return true for January', () => {
			vi.setSystemTime(new Date('2024-01-15'));
			expect(isInTransitionPeriod()).toBe(true);
		});

		it('should return true for February', () => {
			vi.setSystemTime(new Date('2024-02-15'));
			expect(isInTransitionPeriod()).toBe(true);
		});

		it('should return true for March', () => {
			vi.setSystemTime(new Date('2024-03-15'));
			expect(isInTransitionPeriod()).toBe(true);
		});

		it('should return false for April', () => {
			vi.setSystemTime(new Date('2024-04-15'));
			expect(isInTransitionPeriod()).toBe(false);
		});

		it('should return false for December', () => {
			vi.setSystemTime(new Date('2024-12-15'));
			expect(isInTransitionPeriod()).toBe(false);
		});
	});

	describe('getAvailableYears', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-06-15'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return 11 years by default (current + 10 previous)', () => {
			const years = getAvailableYears();
			expect(years).toHaveLength(11);
			expect(years[0]).toBe(2024);
			expect(years[10]).toBe(2014);
		});

		it('should return correct number of years when specified', () => {
			const years = getAvailableYears(5);
			expect(years).toHaveLength(6);
			expect(years[0]).toBe(2024);
			expect(years[5]).toBe(2019);
		});

		it('should return years in descending order', () => {
			const years = getAvailableYears(3);
			expect(years).toEqual([2024, 2023, 2022, 2021]);
		});

		it('should handle 0 years back', () => {
			const years = getAvailableYears(0);
			expect(years).toEqual([2024]);
		});
	});
});