import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readExifDataFromBuffer, analyzeFileMetadata, isInBalticSea } from './exifProcessor';

// Mock logger
vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		warn: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	})
}));

// Mock exifr library
const mockExifrParse = vi.fn();
vi.mock('exifr', async () => ({
	default: {
		parse: mockExifrParse
	},
	parse: mockExifrParse
}));

describe('server exifProcessor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('readExifDataFromBuffer', () => {
		it('should extract GPS coordinates from EXIF data', async () => {
			const mockExifData = {
				latitude: 54.5,
				longitude: 13.5,
				GPSAltitude: 10,
				GPSAltitudeRef: 0,
				DateTimeOriginal: '2024-03-15T14:30:00.000Z'
			};
			mockExifrParse.mockResolvedValue(mockExifData);

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.latitude).toBe(54.5);
			expect(result.longitude).toBe(13.5);
			expect(result.altitude).toBe(10);
			expect(result.timestamp).toEqual(new Date('2024-03-15T14:30:00.000Z'));
		});

		it('should handle negative altitude below sea level', async () => {
			const mockExifData = {
				latitude: 54.5,
				longitude: 13.5,
				GPSAltitude: 10,
				GPSAltitudeRef: 1 // Below sea level
			};
			mockExifrParse.mockResolvedValue(mockExifData);

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.altitude).toBe(-10);
		});

		it('should use DateTime as fallback for timestamp', async () => {
			const mockExifData = {
				latitude: 54.5,
				longitude: 13.5,
				DateTime: '2024-03-15T12:00:00.000Z'
				// No DateTimeOriginal
			};
			mockExifrParse.mockResolvedValue(mockExifData);

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.timestamp).toEqual(new Date('2024-03-15T12:00:00.000Z'));
		});

		it('should return null values when no EXIF data present', async () => {
			mockExifrParse.mockResolvedValue(null);

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.latitude).toBeNull();
			expect(result.longitude).toBeNull();
			expect(result.altitude).toBeNull();
			expect(result.timestamp).toBeNull();
		});

		it('should handle missing GPS coordinates', async () => {
			const mockExifData = {
				DateTime: '2024-03-15T12:00:00.000Z'
				// No GPS data
			};
			mockExifrParse.mockResolvedValue(mockExifData);

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.latitude).toBeNull();
			expect(result.longitude).toBeNull();
			expect(result.altitude).toBeNull();
			expect(result.timestamp).toEqual(new Date('2024-03-15T12:00:00.000Z'));
		});

		it('should handle errors gracefully', async () => {
			mockExifrParse.mockRejectedValue(new Error('EXIF parsing failed'));

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.latitude).toBeNull();
			expect(result.longitude).toBeNull();
			expect(result.altitude).toBeNull();
			expect(result.timestamp).toBeNull();
		});

		it('should handle incomplete GPS data', async () => {
			const mockExifData = {
				latitude: 54.5
				// Missing longitude
			};
			mockExifrParse.mockResolvedValue(mockExifData);

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.latitude).toBe(54.5);
			expect(result.longitude).toBeNull();
		});

		it('should handle altitude without reference', async () => {
			const mockExifData = {
				latitude: 54.5,
				longitude: 13.5,
				GPSAltitude: 15
				// No GPSAltitudeRef
			};
			mockExifrParse.mockResolvedValue(mockExifData);

			const buffer = new ArrayBuffer(1024);
			const result = await readExifDataFromBuffer(buffer, 'test.jpg');

			expect(result.altitude).toBe(15); // Should remain positive
		});
	});

	describe('analyzeFileMetadata', () => {
		it('should analyze image file metadata with EXIF', async () => {
			const mockExifData = {
				latitude: 54.5,
				longitude: 13.5,
				GPSAltitude: 10,
				GPSAltitudeRef: 0
			};
			mockExifrParse.mockResolvedValue(mockExifData);

			const buffer = new ArrayBuffer(1024);
			const result = await analyzeFileMetadata(
				buffer,
				'test.jpg',
				1024,
				'image/jpeg',
				Date.now()
			);

			expect(result.name).toBe('test.jpg');
			expect(result.size).toBe(1024);
			expect(result.type).toBe('image/jpeg');
			expect(result.exif.latitude).toBe(54.5);
			expect(result.exif.longitude).toBe(13.5);
			expect(result.exif.altitude).toBe(10);
		});

		it('should skip EXIF processing for non-image files', async () => {
			const buffer = new ArrayBuffer(1024);
			const result = await analyzeFileMetadata(
				buffer,
				'document.pdf',
				1024,
				'application/pdf',
				Date.now()
			);

			expect(result.name).toBe('document.pdf');
			expect(result.type).toBe('application/pdf');
			expect(result.exif.latitude).toBeNull();
			expect(result.exif.longitude).toBeNull();
			expect(mockExifrParse).not.toHaveBeenCalled();
		});

		it('should handle EXIF processing errors gracefully', async () => {
			mockExifrParse.mockRejectedValue(new Error('EXIF error'));

			const buffer = new ArrayBuffer(1024);
			const result = await analyzeFileMetadata(
				buffer,
				'test.jpg',
				1024,
				'image/jpeg',
				Date.now()
			);

			expect(result.name).toBe('test.jpg');
			expect(result.exif.latitude).toBeNull();
			expect(result.exif.longitude).toBeNull();
		});

		it('should convert lastModified timestamp to Date', async () => {
			const timestamp = 1710512400000; // March 15, 2024
			const buffer = new ArrayBuffer(1024);
			const result = await analyzeFileMetadata(
				buffer,
				'test.jpg',
				1024,
				'image/jpeg',
				timestamp
			);

			expect(result.lastModified).toEqual(new Date(timestamp));
		});

		it('should handle different image types', async () => {
			const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
			
			for (const imageType of imageTypes) {
				mockExifrParse.mockResolvedValue({ latitude: 54.5 });
				
				const buffer = new ArrayBuffer(1024);
				const result = await analyzeFileMetadata(
					buffer,
					`test.${imageType.split('/')[1]}`,
					1024,
					imageType,
					Date.now()
				);

				expect(result.type).toBe(imageType);
				expect(mockExifrParse).toHaveBeenCalled();
				vi.clearAllMocks();
			}
		});
	});

	describe('isInBalticSea', () => {
		it('should return true for coordinates in the Baltic Sea', () => {
			// Coordinates in the Baltic Sea
			expect(isInBalticSea(54.5, 13.5)).toBe(true); // Rügen area
			expect(isInBalticSea(59.0, 18.0)).toBe(true); // Stockholm area
			expect(isInBalticSea(55.7, 12.6)).toBe(true); // Copenhagen area
		});

		it('should return false for coordinates outside the Baltic Sea', () => {
			// Coordinates outside the Baltic Sea
			expect(isInBalticSea(51.5, -0.1)).toBe(false); // London
			expect(isInBalticSea(40.7, -74.0)).toBe(false); // New York
			expect(isInBalticSea(35.7, 139.7)).toBe(false); // Tokyo
		});

		it('should return false for null coordinates', () => {
			expect(isInBalticSea(null, 13.5)).toBe(false);
			expect(isInBalticSea(54.5, null)).toBe(false);
			expect(isInBalticSea(null, null)).toBe(false);
		});

		it('should handle boundary coordinates correctly', () => {
			// Northern boundary
			expect(isInBalticSea(66.0, 20.0)).toBe(true);
			expect(isInBalticSea(66.1, 20.0)).toBe(false);

			// Southern boundary  
			expect(isInBalticSea(53.0, 20.0)).toBe(true);
			expect(isInBalticSea(52.9, 20.0)).toBe(false);

			// Eastern boundary
			expect(isInBalticSea(60.0, 30.0)).toBe(true);
			expect(isInBalticSea(60.0, 30.1)).toBe(false);

			// Western boundary
			expect(isInBalticSea(60.0, 9.0)).toBe(true);
			expect(isInBalticSea(60.0, 8.9)).toBe(false);
		});

		it('should handle edge cases at corners', () => {
			// Test all four corners
			expect(isInBalticSea(66.0, 30.0)).toBe(true); // NE
			expect(isInBalticSea(66.0, 9.0)).toBe(true);  // NW
			expect(isInBalticSea(53.0, 30.0)).toBe(true); // SE
			expect(isInBalticSea(53.0, 9.0)).toBe(true);  // SW
		});

		it('should handle coordinates just outside boundaries', () => {
			// Just outside each boundary
			expect(isInBalticSea(66.1, 20.0)).toBe(false); // North
			expect(isInBalticSea(52.9, 20.0)).toBe(false); // South
			expect(isInBalticSea(60.0, 30.1)).toBe(false); // East
			expect(isInBalticSea(60.0, 8.9)).toBe(false);  // West
		});

		it('should handle zero coordinates', () => {
			expect(isInBalticSea(0, 0)).toBe(false);
			expect(isInBalticSea(0, 13.5)).toBe(false);
			expect(isInBalticSea(54.5, 0)).toBe(false);
		});

		it('should handle negative coordinates correctly', () => {
			expect(isInBalticSea(-54.5, 13.5)).toBe(false);
			expect(isInBalticSea(54.5, -13.5)).toBe(false);
			expect(isInBalticSea(-54.5, -13.5)).toBe(false);
		});

		it('should handle very large coordinates', () => {
			expect(isInBalticSea(1000, 2000)).toBe(false);
			expect(isInBalticSea(-1000, -2000)).toBe(false);
		});
	});
});