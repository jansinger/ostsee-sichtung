import { describe, it, expect } from 'vitest';
import { dmsToDd, dmToDd, ddToDms, ddToDm } from './coordinateConversion';

describe('coordinateConversion', () => {
	describe('dmsToDd', () => {
		it('should convert positive DMS to decimal degrees', () => {
			const result = dmsToDd(54, 30, 36, 1);
			expect(result).toBe(54.51);
		});

		it('should convert negative DMS to decimal degrees', () => {
			const result = dmsToDd(54, 30, 36, -1);
			expect(result).toBe(-54.51);
		});

		it('should handle zero values', () => {
			const result = dmsToDd(0, 0, 0, 1);
			expect(result).toBe(0);
		});

		it('should handle only degrees', () => {
			const result = dmsToDd(45, 0, 0, 1);
			expect(result).toBe(45);
		});

		it('should handle NaN inputs gracefully', () => {
			const result = dmsToDd(NaN, 30, 36, 1);
			expect(result).toBe(0.51);
		});

		it('should handle complex coordinates', () => {
			const result = dmsToDd(13, 24, 36, 1);
			expect(result).toBe(13.41);
		});

		it('should round to 4 decimal places', () => {
			const result = dmsToDd(54, 30, 36.123456789, 1);
			expect(result.toString().split('.')[1]?.length).toBeLessThanOrEqual(4);
		});
	});

	describe('dmToDd', () => {
		it('should convert positive DM to decimal degrees', () => {
			const result = dmToDd(54, 30.6, 1);
			expect(result).toBe(54.51);
		});

		it('should convert negative DM to decimal degrees', () => {
			const result = dmToDd(54, 30.6, -1);
			expect(result).toBe(-54.51);
		});

		it('should handle zero values', () => {
			const result = dmToDd(0, 0, 1);
			expect(result).toBe(0);
		});

		it('should handle NaN inputs gracefully', () => {
			const result = dmToDd(NaN, 30.6, 1);
			expect(result).toBe(0.51);
		});

		it('should round to 4 decimal places', () => {
			const result = dmToDd(13, 24.6123456789, 1);
			expect(result.toString().split('.')[1]?.length).toBeLessThanOrEqual(4);
		});
	});

	describe('ddToDms', () => {
		it('should convert positive decimal degrees to DMS', () => {
			const result = ddToDms(54.51);
			expect(result).toEqual({
				deg: 54,
				min: 30,
				sec: 36
			});
		});

		it('should convert negative decimal degrees to DMS', () => {
			const result = ddToDms(-54.51);
			expect(result).toEqual({
				deg: -54,
				min: 30,
				sec: 36
			});
		});

		it('should handle zero', () => {
			const result = ddToDms(0);
			expect(result).toEqual({
				deg: 0,
				min: 0,
				sec: 0
			});
		});

		it('should handle NaN input', () => {
			const result = ddToDms(NaN);
			expect(result).toEqual({
				deg: 0,
				min: 0,
				sec: 0
			});
		});

		it('should handle fractional degrees only', () => {
			const result = ddToDms(0.51);
			expect(result).toEqual({
				deg: 0,
				min: 30,
				sec: 36
			});
		});

		it('should round seconds properly', () => {
			const result = ddToDms(54.5099);
			expect(result.sec).toBeGreaterThanOrEqual(0);
			expect(result.sec).toBeLessThan(60);
		});
	});

	describe('ddToDm', () => {
		it('should convert positive decimal degrees to DM', () => {
			const result = ddToDm(54.51);
			expect(result).toEqual({
				deg: 54,
				min: 30.6
			});
		});

		it('should convert negative decimal degrees to DM', () => {
			const result = ddToDm(-54.51);
			expect(result).toEqual({
				deg: -54,
				min: 30.6
			});
		});

		it('should handle zero', () => {
			const result = ddToDm(0);
			expect(result).toEqual({
				deg: 0,
				min: 0
			});
		});

		it('should handle NaN input', () => {
			const result = ddToDm(NaN);
			expect(result).toEqual({
				deg: 0,
				min: 0
			});
		});

		it('should round minutes to 2 decimal places', () => {
			const result = ddToDm(13.41025);
			expect(result.min.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
		});
	});

	describe('round trip conversions', () => {
		it('should maintain precision in DMS round trip', () => {
			const original = 54.51;
			const dms = ddToDms(original);
			const converted = dmsToDd(dms.deg, dms.min, dms.sec, original >= 0 ? 1 : -1);
			expect(Math.abs(converted - original)).toBeLessThan(0.01);
		});

		it('should maintain precision in DM round trip', () => {
			const original = 54.51;
			const dm = ddToDm(original);
			const converted = dmToDd(dm.deg, dm.min, original >= 0 ? 1 : -1);
			expect(Math.abs(converted - original)).toBeLessThan(0.01);
		});
	});
});