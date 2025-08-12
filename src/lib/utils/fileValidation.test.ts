import { describe, it, expect } from 'vitest';
import { validateFiles, FILE_VALIDATION_PRESETS } from './fileValidation';
import type { FileValidationConfig } from './fileValidation';

describe('fileValidation', () => {
	describe('validateFiles', () => {
		it('should validate files correctly', () => {
			const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
			Object.defineProperty(imageFile, 'size', { value: 1000 }); // 1KB
			
			const config: FileValidationConfig = {
				allowedTypes: ['image/jpeg'],
				maxSize: 5000 // 5KB
			};
			
			const result = validateFiles([imageFile], config);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.validFiles).toHaveLength(1);
		});

		it('should reject files that are too large', () => {
			const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
			Object.defineProperty(largeFile, 'size', { value: 10000 }); // 10KB
			
			const config: FileValidationConfig = {
				allowedTypes: ['image/jpeg'],
				maxSize: 5000 // 5KB
			};
			
			const result = validateFiles([largeFile], config);
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should reject disallowed file types', () => {
			const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
			
			const config: FileValidationConfig = {
				allowedTypes: ['image/jpeg'],
				maxSize: 5000
			};
			
			const result = validateFiles([textFile], config);
			expect(result.isValid).toBe(false);
			expect(result.invalidFiles).toHaveLength(1);
		});

		it('should reject too many files', () => {
			const file1 = new File(['test'], 'test1.jpg', { type: 'image/jpeg' });
			const file2 = new File(['test'], 'test2.jpg', { type: 'image/jpeg' });
			
			const config: FileValidationConfig = {
				allowedTypes: ['image/jpeg'],
				maxFiles: 1
			};
			
			const result = validateFiles([file1, file2], config);
			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('Maximal'))).toBe(true);
		});
	});

	describe('FILE_VALIDATION_PRESETS', () => {
		it('should have PHOTO_GPS preset', () => {
			expect(FILE_VALIDATION_PRESETS.PHOTO_GPS).toBeDefined();
			expect(FILE_VALIDATION_PRESETS.PHOTO_GPS.maxSize).toBeGreaterThan(0);
			expect(FILE_VALIDATION_PRESETS.PHOTO_GPS.allowedTypes).toContain('image/jpeg');
		});

		it('should have MEDIA preset', () => {
			expect(FILE_VALIDATION_PRESETS.MEDIA).toBeDefined();
			expect(FILE_VALIDATION_PRESETS.MEDIA.maxSize).toBeGreaterThan(0);
			expect(Array.isArray(FILE_VALIDATION_PRESETS.MEDIA.allowedTypes)).toBe(true);
		});
	});
});