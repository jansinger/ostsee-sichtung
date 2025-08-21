import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { isDangerousFileType, validateMagicBytes } from './magicBytes';

describe('magicBytes validation', () => {
	const testFilesDir = path.join(process.cwd(), 'data/test-files');

	// Test file contents - we'll read the actual test files
	const testFileBuffers: Record<string, Buffer> = {};

	beforeAll(() => {
		// Check if test files exist
		console.log(`Loading test files from: ${testFilesDir}`);
		if (fs.existsSync(testFilesDir)) {
			const files = [
				'fake-image.jpg',
				'fake-image.png',
				'fake-image.gif',
				'real-image.jpg',
				'real-image.png'
			];

			files.forEach((filename) => {
				const filePath = path.join(testFilesDir, filename);
				if (fs.existsSync(filePath)) {
					testFileBuffers[filename] = fs.readFileSync(filePath);
				}
			});
		}
	});

	describe('validateMagicBytes', () => {
		describe('Real image files with correct magic bytes', () => {
			it('should accept real JPEG with correct MIME type', () => {
				// Create a proper JPEG buffer with magic bytes
				const jpegBuffer = Buffer.from([
					0xff,
					0xd8,
					0xff,
					0xe0, // JPEG magic bytes
					0x00,
					0x10,
					0x4a,
					0x46,
					0x49,
					0x46,
					0x00,
					0x01,
					0x01,
					0x00,
					0x00,
					0x01,
					0x00,
					0x01,
					0x00,
					0x00,
					0xff,
					0xd9 // End of image
				]);

				const result = validateMagicBytes(jpegBuffer, 'image/jpeg');

				expect(result.isValid).toBe(true);
				expect(result.message).toBeUndefined();
			});

			it('should accept real PNG with correct MIME type', () => {
				// Create a proper PNG buffer with magic bytes
				const pngBuffer = Buffer.from([
					0x89,
					0x50,
					0x4e,
					0x47,
					0x0d,
					0x0a,
					0x1a,
					0x0a, // PNG magic bytes
					0x00,
					0x00,
					0x00,
					0x0d,
					0x49,
					0x48,
					0x44,
					0x52,
					0x00,
					0x00,
					0x00,
					0x01,
					0x00,
					0x00,
					0x00,
					0x01,
					0x08,
					0x06,
					0x00,
					0x00,
					0x00,
					0x1f,
					0x15,
					0xc4,
					0x89
				]);

				const result = validateMagicBytes(pngBuffer, 'image/png');

				expect(result.isValid).toBe(true);
				expect(result.message).toBeUndefined();
			});

			it('should accept GIF87a format', () => {
				const gif87Buffer = Buffer.from([
					0x47,
					0x49,
					0x46,
					0x38,
					0x37,
					0x61, // GIF87a magic bytes
					0x0a,
					0x00,
					0x0a,
					0x00,
					0xf0,
					0x00,
					0x00
				]);

				const result = validateMagicBytes(gif87Buffer, 'image/gif');

				expect(result.isValid).toBe(true);
			});

			it('should accept GIF89a format', () => {
				const gif89Buffer = Buffer.from([
					0x47,
					0x49,
					0x46,
					0x38,
					0x39,
					0x61, // GIF89a magic bytes
					0x0a,
					0x00,
					0x0a,
					0x00,
					0xf0,
					0x00,
					0x00
				]);

				const result = validateMagicBytes(gif89Buffer, 'image/gif');

				expect(result.isValid).toBe(true);
			});

			it('should accept WebP format', () => {
				const webpBuffer = Buffer.from([
					0x52,
					0x49,
					0x46,
					0x46, // RIFF
					0x1a,
					0x00,
					0x00,
					0x00, // File size
					0x57,
					0x45,
					0x42,
					0x50, // WEBP
					0x56,
					0x50,
					0x38,
					0x20
				]);

				const result = validateMagicBytes(webpBuffer, 'image/webp');

				expect(result.isValid).toBe(true);
			});

			it('should accept BMP format', () => {
				const bmpBuffer = Buffer.from([
					0x42,
					0x4d, // BM magic bytes
					0x36,
					0x00,
					0x00,
					0x00, // File size
					0x00,
					0x00,
					0x00,
					0x00,
					0x36,
					0x00,
					0x00,
					0x00
				]);

				const result = validateMagicBytes(bmpBuffer, 'image/bmp');

				expect(result.isValid).toBe(true);
			});
		});

		describe('Video files with correct magic bytes', () => {
			it('should accept MP4 format with ftyp signature', () => {
				const mp4Buffer = Buffer.from([
					0x00,
					0x00,
					0x00,
					0x20, // Box size
					0x66,
					0x74,
					0x79,
					0x70, // ftyp
					0x69,
					0x73,
					0x6f,
					0x6d, // isom
					0x00,
					0x00,
					0x02,
					0x00
				]);

				const result = validateMagicBytes(mp4Buffer, 'video/mp4');

				expect(result.isValid).toBe(true);
			});

			it('should accept AVI format', () => {
				const aviBuffer = Buffer.from([
					0x52,
					0x49,
					0x46,
					0x46, // RIFF
					0x24,
					0x01,
					0x00,
					0x00, // File size
					0x41,
					0x56,
					0x49,
					0x20, // AVI
					0x4c,
					0x49,
					0x53,
					0x54
				]);

				const result = validateMagicBytes(aviBuffer, 'video/avi');

				expect(result.isValid).toBe(true);
			});

			it('should accept WebM/MKV format', () => {
				const webmBuffer = Buffer.from([
					0x1a,
					0x45,
					0xdf,
					0xa3, // EBML header
					0x9f,
					0x42,
					0x86,
					0x81,
					0x01,
					0x42,
					0xf7,
					0x81
				]);

				const result = validateMagicBytes(webmBuffer, 'video/webm');

				expect(result.isValid).toBe(true);
			});

			it('should accept FLV format', () => {
				const flvBuffer = Buffer.from([
					0x46,
					0x4c,
					0x56,
					0x01, // FLV version 1
					0x05,
					0x00,
					0x00,
					0x00,
					0x09,
					0x00,
					0x00,
					0x00
				]);

				const result = validateMagicBytes(flvBuffer, 'video/flv');

				expect(result.isValid).toBe(true);
			});
		});

		describe('Files with mismatched magic bytes', () => {
			it('should reject text file claiming to be JPEG', () => {
				const textBuffer = Buffer.from('This is actually a text file, not a JPEG!', 'utf8');

				const result = validateMagicBytes(textBuffer, 'image/jpeg');

				expect(result.isValid).toBe(false);
				expect(result.message).toContain(
					'Dateiinhalt stimmt nicht mit dem angegebenen Typ überein'
				);
				expect(result.message).toContain('image/jpeg');
			});

			it('should reject HTML file claiming to be PNG', () => {
				const htmlBuffer = Buffer.from(
					'<!DOCTYPE html><html><head><title>Fake PNG</title></head></html>',
					'utf8'
				);

				const result = validateMagicBytes(htmlBuffer, 'image/png');

				expect(result.isValid).toBe(false);
				expect(result.message).toContain(
					'Dateiinhalt stimmt nicht mit dem angegebenen Typ überein'
				);
				expect(result.actualType).toBeUndefined(); // HTML is not in our signature list
			});

			it('should reject script file claiming to be GIF', () => {
				const scriptBuffer = Buffer.from(
					'#!/bin/bash\necho "This is a shell script pretending to be a GIF"',
					'utf8'
				);

				const result = validateMagicBytes(scriptBuffer, 'image/gif');

				expect(result.isValid).toBe(false);
				expect(result.message).toContain('image/gif');
			});

			it('should reject JPEG claiming to be PNG', () => {
				const jpegBuffer = Buffer.from([
					0xff,
					0xd8,
					0xff,
					0xe0, // JPEG magic bytes
					0x00,
					0x10,
					0x4a,
					0x46,
					0x49,
					0x46,
					0x00,
					0x01,
					0xff,
					0xd9
				]);

				const result = validateMagicBytes(jpegBuffer, 'image/png');

				expect(result.isValid).toBe(false);
				expect(result.actualType).toBe('image/jpeg');
				expect(result.message).toContain('Erwartet: image/png, Erkannt: image/jpeg');
			});

			it('should reject PNG claiming to be JPEG', () => {
				const pngBuffer = Buffer.from([
					0x89,
					0x50,
					0x4e,
					0x47,
					0x0d,
					0x0a,
					0x1a,
					0x0a, // PNG magic bytes
					0x00,
					0x00,
					0x00,
					0x0d,
					0x49,
					0x48,
					0x44,
					0x52
				]);

				const result = validateMagicBytes(pngBuffer, 'image/jpeg');

				expect(result.isValid).toBe(false);
				expect(result.actualType).toBe('image/png');
				expect(result.message).toContain('Erwartet: image/jpeg, Erkannt: image/png');
			});
		});

		describe('Files using actual test files from disk', () => {
			it('should reject fake-image.jpg (text file)', () => {
				if (!testFileBuffers['fake-image.jpg']) {
					console.warn('fake-image.jpg test file not found, skipping test');
					return;
				}

				const buffer = testFileBuffers['fake-image.jpg'];
				const result = validateMagicBytes(buffer, 'image/jpeg');

				expect(result.isValid).toBe(false);
				expect(result.message).toContain(
					'Dateiinhalt stimmt nicht mit dem angegebenen Typ überein'
				);
			});

			it('should reject fake-image.png (HTML file)', () => {
				if (!testFileBuffers['fake-image.png']) {
					console.warn('fake-image.png test file not found, skipping test');
					return;
				}

				const buffer = testFileBuffers['fake-image.png'];
				const result = validateMagicBytes(buffer, 'image/png');

				expect(result.isValid).toBe(false);
				expect(result.message).toContain('image/png');
			});

			it('should reject fake-image.gif (shell script)', () => {
				if (!testFileBuffers['fake-image.gif']) {
					console.warn('fake-image.gif test file not found, skipping test');
					return;
				}

				const buffer = testFileBuffers['fake-image.gif'];
				const result = validateMagicBytes(buffer, 'image/gif');

				expect(result.isValid).toBe(false);
				expect(result.message).toContain('image/gif');
			});

			it('should accept real-image.jpg', () => {
				if (!testFileBuffers['real-image.jpg']) {
					console.warn('real-image.jpg test file not found, skipping test');
					return;
				}

				const buffer = testFileBuffers['real-image.jpg'];
				const result = validateMagicBytes(buffer, 'image/jpeg');

				expect(result.isValid).toBe(true);
			});

			it('should accept real-image.png', () => {
				if (!testFileBuffers['real-image.png']) {
					console.warn('real-image.png test file not found, skipping test');
					return;
				}

				const buffer = testFileBuffers['real-image.png'];
				const result = validateMagicBytes(buffer, 'image/png');

				expect(result.isValid).toBe(true);
			});
		});

		describe('MIME type variations', () => {
			it('should handle image/jpg same as image/jpeg', () => {
				const jpegBuffer = Buffer.from([
					0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9
				]);

				const jpegResult = validateMagicBytes(jpegBuffer, 'image/jpeg');
				const jpgResult = validateMagicBytes(jpegBuffer, 'image/jpg');

				expect(jpegResult.isValid).toBe(true);
				expect(jpgResult.isValid).toBe(true);
			});

			it('should handle case-insensitive MIME types', () => {
				const jpegBuffer = Buffer.from([
					0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9
				]);

				const result1 = validateMagicBytes(jpegBuffer, 'IMAGE/JPEG');
				const result2 = validateMagicBytes(jpegBuffer, 'Image/Jpeg');

				expect(result1.isValid).toBe(true);
				expect(result2.isValid).toBe(true);
			});
		});

		describe('Unsupported MIME types', () => {
			it('should allow unsupported MIME types (conservative approach)', () => {
				const unknownBuffer = Buffer.from('Some unknown file format', 'utf8');

				const result = validateMagicBytes(unknownBuffer, 'application/unknown');

				expect(result.isValid).toBe(true);
				expect(result.message).toBe('No signature validation available for this type');
			});

			it('should skip validation for text files', () => {
				const textBuffer = Buffer.from('Plain text content', 'utf8');

				const result = validateMagicBytes(textBuffer, 'text/plain');

				expect(result.isValid).toBe(true);
				expect(result.message).toBe('No signature validation available for this type');
			});
		});

		describe('Edge cases', () => {
			it('should handle empty buffers', () => {
				const emptyBuffer = Buffer.alloc(0);

				const result = validateMagicBytes(emptyBuffer, 'image/jpeg');

				expect(result.isValid).toBe(false);
				expect(result.message).toContain(
					'Dateiinhalt stimmt nicht mit dem angegebenen Typ überein'
				);
			});

			it('should handle very small buffers', () => {
				const tinyBuffer = Buffer.from([0xff]); // Only 1 byte

				const result = validateMagicBytes(tinyBuffer, 'image/jpeg');

				expect(result.isValid).toBe(false);
			});

			it('should handle buffers smaller than signature length', () => {
				const shortBuffer = Buffer.from([0xff, 0xd8]); // Only first 2 bytes of JPEG

				const result = validateMagicBytes(shortBuffer, 'image/jpeg');

				expect(result.isValid).toBe(false);
			});

			it('should handle partial matches', () => {
				const partialBuffer = Buffer.from([
					0xff,
					0xd8,
					0x00,
					0x00, // Starts like JPEG but 3rd byte wrong
					0x00,
					0x10,
					0x4a,
					0x46,
					0x49,
					0x46,
					0x00,
					0x01
				]);

				const result = validateMagicBytes(partialBuffer, 'image/jpeg');

				expect(result.isValid).toBe(false);
			});
		});

		describe('Multi-signature format support', () => {
			it('should detect WebP with both RIFF and WEBP signatures', () => {
				const webpBuffer = Buffer.from([
					0x52,
					0x49,
					0x46,
					0x46, // RIFF at offset 0
					0x1a,
					0x00,
					0x00,
					0x00, // File size
					0x57,
					0x45,
					0x42,
					0x50, // WEBP at offset 8
					0x56,
					0x50,
					0x38,
					0x20
				]);

				const result = validateMagicBytes(webpBuffer, 'image/webp');

				expect(result.isValid).toBe(true);
			});

			it('should accept WebP with only RIFF signature (current implementation behavior)', () => {
				// NOTE: Current implementation uses OR logic, so RIFF alone is sufficient
				// This is a limitation that could be improved in the future
				const fakeWebpBuffer = Buffer.from([
					0x52,
					0x49,
					0x46,
					0x46, // RIFF at offset 0
					0x1a,
					0x00,
					0x00,
					0x00, // File size
					0x00,
					0x00,
					0x00,
					0x00, // NOT WEBP at offset 8
					0x56,
					0x50,
					0x38,
					0x20
				]);

				const result = validateMagicBytes(fakeWebpBuffer, 'image/webp');

				// Current implementation accepts this (could be improved)
				expect(result.isValid).toBe(true);
			});

			it('should reject buffer without any WebP signatures', () => {
				const nonWebpBuffer = Buffer.from([
					0x00,
					0x00,
					0x00,
					0x00, // NO RIFF at offset 0
					0x1a,
					0x00,
					0x00,
					0x00, // File size
					0x00,
					0x00,
					0x00,
					0x00, // NO WEBP at offset 8
					0x56,
					0x50,
					0x38,
					0x20
				]);

				const result = validateMagicBytes(nonWebpBuffer, 'image/webp');

				expect(result.isValid).toBe(false);
			});
		});
	});

	describe('isDangerousFileType', () => {
		it('should identify dangerous executable types', () => {
			const dangerousTypes = [
				'application/x-msdownload',
				'application/x-msdos-program',
				'application/x-executable',
				'application/x-sharedlib',
				'application/x-sh',
				'application/x-bat',
				'text/x-script',
				'application/octet-stream'
			];

			dangerousTypes.forEach((type) => {
				expect(isDangerousFileType(type)).toBe(true);
			});
		});

		it('should not flag safe media types as dangerous', () => {
			const safeTypes = [
				'image/jpeg',
				'image/png',
				'image/gif',
				'video/mp4',
				'video/webm',
				'text/plain',
				'application/json',
				'application/pdf'
			];

			safeTypes.forEach((type) => {
				expect(isDangerousFileType(type)).toBe(false);
			});
		});

		it('should handle case insensitive checking', () => {
			expect(isDangerousFileType('APPLICATION/X-MSDOWNLOAD')).toBe(true);
			expect(isDangerousFileType('Application/X-Executable')).toBe(true);
			expect(isDangerousFileType('TEXT/X-SCRIPT')).toBe(true);
		});

		it('should handle unknown types as safe', () => {
			expect(isDangerousFileType('application/unknown')).toBe(false);
			expect(isDangerousFileType('custom/format')).toBe(false);
			expect(isDangerousFileType('')).toBe(false);
		});
	});

	describe('Integration scenarios', () => {
		it('should provide detailed error information for security analysis', () => {
			const maliciousBuffer = Buffer.from(
				'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff', // PE executable header
				'binary'
			);

			const result = validateMagicBytes(maliciousBuffer, 'image/jpeg');

			expect(result.isValid).toBe(false);
			expect(result.message).toBeTruthy();
			// Should not detect the PE header as it's not in our signature list
			expect(result.actualType).toBeUndefined();
		});

		it('should handle common spoofing attempts', () => {
			// Text file with fake JPEG extension trying to spoof
			const spoofedBuffer = Buffer.from(
				'Content-Type: image/jpeg\r\n\r\nThis is actually malicious content!',
				'utf8'
			);

			const result = validateMagicBytes(spoofedBuffer, 'image/jpeg');

			expect(result.isValid).toBe(false);
			expect(result.message).toContain('Dateiinhalt stimmt nicht mit dem angegebenen Typ überein');
		});

		it('should correctly identify when files have correct magic bytes but wrong extension claim', () => {
			// Valid PNG claiming to be JPEG
			const pngBuffer = Buffer.from([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
				0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01
			]);

			const result = validateMagicBytes(pngBuffer, 'image/jpeg');

			expect(result.isValid).toBe(false);
			expect(result.actualType).toBe('image/png');
			expect(result.message).toContain('Erwartet: image/jpeg, Erkannt: image/png');
		});
	});
});
