import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getDefaultSightingYear,
	isInTransitionPeriod,
	deriveSelectableYears,
	pickDefaultYear
} from './defaultYear';

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

	// N4: Das Jahres-Dropdown speist sich aus GET /api/map/sightings/years —
	// alle Jahre mit Daten, nicht nur die letzten 10.
	describe('deriveSelectableYears', () => {
		it('liefert alle Jahre mit Daten absteigend, vereint mit dem aktuellen Kalenderjahr', () => {
			const available = [
				{ year: 2007, count: 5 },
				{ year: 2025, count: 817 },
				{ year: 2010, count: 3 }
			];
			expect(deriveSelectableYears(available, 2026)).toEqual([2026, 2025, 2010, 2007]);
		});

		it('schließt Jahre ohne Sichtungen (count 0) aus', () => {
			const available = [
				{ year: 2024, count: 0 },
				{ year: 2023, count: 5 }
			];
			expect(deriveSelectableYears(available, 2026)).toEqual([2026, 2023]);
		});

		it('dupliziert das aktuelle Kalenderjahr nicht, wenn es bereits Daten hat', () => {
			expect(deriveSelectableYears([{ year: 2026, count: 10 }], 2026)).toEqual([2026]);
		});

		it('fällt bei leerer Endpoint-Antwort auf die letzten 11 Kalenderjahre zurück', () => {
			expect(deriveSelectableYears([], 2026)).toEqual([
				2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016
			]);
		});

		it('fällt zurück, wenn kein einziges Jahr Daten hat (nur count 0)', () => {
			expect(deriveSelectableYears([{ year: 2025, count: 0 }], 2026)).toEqual([
				2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016
			]);
		});

		it('ergänzt ein URL-Jahr (M4, ?year=…), das nicht in der Endpoint-Liste steht', () => {
			const available = [{ year: 2025, count: 10 }];
			expect(deriveSelectableYears(available, 2026, 2008)).toEqual([2026, 2025, 2008]);
		});

		it('dupliziert ein URL-Jahr nicht, das die Endpoint-Liste bereits enthält', () => {
			const available = [
				{ year: 2008, count: 4 },
				{ year: 2025, count: 10 }
			];
			expect(deriveSelectableYears(available, 2026, 2008)).toEqual([2026, 2025, 2008]);
		});

		it('ergänzt das URL-Jahr auch im Fallback-Fall (geteilte URL bei leerer DB)', () => {
			expect(deriveSelectableYears([], 2026, 2008)).toEqual([
				2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2008
			]);
		});
	});

	describe('pickDefaultYear', () => {
		it('gibt den Fallback zurück, wenn die Liste leer ist', () => {
			expect(pickDefaultYear([], 2025)).toBe(2025);
		});

		it('gibt den Fallback zurück, wenn kein Jahr Daten hat (count 0)', () => {
			const years = [
				{ year: 2025, count: 0 },
				{ year: 2024, count: 0 }
			];
			expect(pickDefaultYear(years, 2025)).toBe(2025);
		});

		it('gibt das aktuelle Jahr zurück, wenn es Daten hat', () => {
			const years = [
				{ year: 2025, count: 817 },
				{ year: 2024, count: 620 }
			];
			expect(pickDefaultYear(years, 2025)).toBe(2025);
		});

		it('gibt das jüngste Jahr mit Daten zurück, wenn nur ältere Jahre Daten haben', () => {
			const years = [
				{ year: 2025, count: 0 },
				{ year: 2024, count: 620 },
				{ year: 2023, count: 400 }
			];
			expect(pickDefaultYear(years, 2025)).toBe(2024);
		});

		it('ignoriert Jahre nach dem Fallback-Jahr, wenn ältere Jahre mit Daten existieren', () => {
			const years = [
				{ year: 2026, count: 5 },
				{ year: 2024, count: 620 }
			];
			expect(pickDefaultYear(years, 2025)).toBe(2024);
		});

		it('greift auf das jüngste Jahr mit Daten überhaupt zurück, wenn alle Jahre mit Daten in der Zukunft liegen', () => {
			const years = [
				{ year: 2027, count: 3 },
				{ year: 2026, count: 5 }
			];
			expect(pickDefaultYear(years, 2025)).toBe(2027);
		});

		it('ist unabhängig von der Reihenfolge der Eingabeliste', () => {
			const years = [
				{ year: 2022, count: 10 },
				{ year: 2024, count: 20 },
				{ year: 2023, count: 15 }
			];
			expect(pickDefaultYear(years, 2025)).toBe(2024);
		});
	});
});
