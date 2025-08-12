import { describe, it, expect } from 'vitest';
import { formatLocation } from './formatLocation';

describe('formatLocation', () => {
	it('should format coordinates correctly (lon, lat order)', () => {
		const result = formatLocation(11.2, 54.5); // lon, lat
		expect(result).toContain('54°');
		expect(result).toContain('11°');
	});

	it('should handle NaN coordinates', () => {
		const result = formatLocation(NaN, NaN);
		expect(result).toBe('-');
	});

	it('should handle invalid coordinates', () => {
		const result1 = formatLocation(NaN, 54.5);
		expect(result1).toBe('-');
		
		const result2 = formatLocation(11.2, NaN);
		expect(result2).toBe('-');
	});

	it('should format precise coordinates with HDMS', () => {
		const result = formatLocation(11.654321, 54.123456); // lon, lat
		// OpenLayers toStringHDMS format: uses degrees, minutes, seconds
		expect(result).toContain('°'); // Contains degrees
		expect(result).toContain('′'); // Contains minutes  
		expect(result).toContain('″'); // Contains seconds
		expect(result).toContain('N'); // North
		expect(result).toContain('E'); // East
	});

	it('should handle zero coordinates', () => {
		const result = formatLocation(0, 0);
		expect(result).toContain('0°');
		expect(result).not.toBe('-');
	});
});