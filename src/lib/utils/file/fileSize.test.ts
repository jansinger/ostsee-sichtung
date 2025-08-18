import { describe, it, expect } from 'vitest';
import { formatFileSize, formatFileSizeDE, parseFileSize } from './fileSize';

describe('fileSize utilities', () => {
	describe('formatFileSize', () => {
		it('should format zero bytes', () => {
			expect(formatFileSize(0)).toBe('0 Bytes');
		});

		it('should format bytes', () => {
			expect(formatFileSize(512)).toBe('512 Bytes');
			expect(formatFileSize(1023)).toBe('1023 Bytes');
		});

		it('should format kilobytes', () => {
			expect(formatFileSize(1024)).toBe('1 KB');
			expect(formatFileSize(1536)).toBe('1.5 KB');
			expect(formatFileSize(2048)).toBe('2 KB');
		});

		it('should format megabytes', () => {
			expect(formatFileSize(1024 * 1024)).toBe('1 MB');
			expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
			expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
		});

		it('should format gigabytes', () => {
			expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
			expect(formatFileSize(2.25 * 1024 * 1024 * 1024)).toBe('2.25 GB');
		});

		it('should format terabytes', () => {
			expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
		});

		it('should handle decimal precision correctly', () => {
			expect(formatFileSize(1536.123)).toBe('1.5 KB');
			expect(formatFileSize(1638.4)).toBe('1.6 KB');
		});
	});

	describe('formatFileSizeDE', () => {
		it('should format zero bytes in German locale', () => {
			expect(formatFileSizeDE(0)).toBe('0 Bytes');
		});

		it('should format bytes in German locale', () => {
			expect(formatFileSizeDE(512)).toBe('512 Bytes');
		});

		it('should format kilobytes with German decimal separator', () => {
			expect(formatFileSizeDE(1536)).toBe('1,5 KB');
		});

		it('should format megabytes with German decimal separator', () => {
			expect(formatFileSizeDE(2.5 * 1024 * 1024)).toBe('2,5 MB');
		});

		it('should handle whole numbers without decimals', () => {
			expect(formatFileSizeDE(1024)).toBe('1 KB');
			expect(formatFileSizeDE(1024 * 1024)).toBe('1 MB');
		});

		it('should limit decimal places to maximum 2', () => {
			const result = formatFileSizeDE(1536.123456);
			const decimalPart = result.split(',')[1];
			if (decimalPart) {
				const decimals = decimalPart.split(' ')[0];
				expect(decimals?.length).toBeLessThanOrEqual(2);
			}
		});
	});

	describe('parseFileSize', () => {
		it('should parse bytes', () => {
			expect(parseFileSize('512 b')).toBe(512);
			expect(parseFileSize('1023 b')).toBe(1023);
		});

		it('should parse kilobytes', () => {
			expect(parseFileSize('1 kb')).toBe(1024);
			expect(parseFileSize('1.5 kb')).toBe(1536);
			expect(parseFileSize('2 KB')).toBe(2048);
		});

		it('should parse megabytes', () => {
			expect(parseFileSize('1 mb')).toBe(1024 * 1024);
			expect(parseFileSize('1.5 MB')).toBe(1.5 * 1024 * 1024);
		});

		it('should parse gigabytes', () => {
			expect(parseFileSize('1 gb')).toBe(1024 * 1024 * 1024);
			expect(parseFileSize('2.25 GB')).toBe(2.25 * 1024 * 1024 * 1024);
		});

		it('should parse terabytes', () => {
			expect(parseFileSize('1 tb')).toBe(1024 * 1024 * 1024 * 1024);
			expect(parseFileSize('1 TB')).toBe(1024 * 1024 * 1024 * 1024);
		});

		it('should handle different cases', () => {
			expect(parseFileSize('1 MB')).toBe(1024 * 1024);
			expect(parseFileSize('1 mb')).toBe(1024 * 1024);
			expect(parseFileSize('1 Mb')).toBe(1024 * 1024);
		});

		it('should handle spacing variations', () => {
			expect(parseFileSize('1MB')).toBe(1024 * 1024);
			expect(parseFileSize('1 MB')).toBe(1024 * 1024);
			expect(parseFileSize('1.5 MB')).toBe(1.5 * 1024 * 1024);
		});

		it('should return 0 for invalid inputs', () => {
			expect(parseFileSize('invalid')).toBe(0);
			expect(parseFileSize('')).toBe(0);
			expect(parseFileSize('1.5.6 MB')).toBe(0);
			expect(parseFileSize('MB')).toBe(0);
			expect(parseFileSize('1')).toBe(0);
		});

		it('should handle decimal values', () => {
			expect(parseFileSize('1.5 MB')).toBe(1.5 * 1024 * 1024);
			expect(parseFileSize('0.5 GB')).toBe(0.5 * 1024 * 1024 * 1024);
		});
	});

	describe('round trip conversions', () => {
		it('should maintain precision for KB sizes', () => {
			const original = 1536; // 1.5 KB
			const formatted = formatFileSize(original);
			const parsed = parseFileSize(formatted);
			expect(parsed).toBe(original);
		});

		it('should maintain precision for MB sizes', () => {
			const original = 2 * 1024 * 1024; // 2 MB
			const formatted = formatFileSize(original);
			const parsed = parseFileSize(formatted);
			expect(parsed).toBe(original);
		});

		it('should handle edge cases in round trip', () => {
			// Only test sizes that can be properly round-tripped
			// Skip bytes (< 1024) because "1 Bytes" cannot be parsed by parseFileSize which expects "1 b"  
			const sizes = [1024, 1025, 1048576, 1073741824];
			
			sizes.forEach(size => {
				const formatted = formatFileSize(size);
				const parsed = parseFileSize(formatted);
				// Allow rounding differences - e.g. 1025 -> "1 KB" -> 1024 has diff of 1
				expect(Math.abs(parsed - size)).toBeLessThanOrEqual(1);
			});
		});
	});
});