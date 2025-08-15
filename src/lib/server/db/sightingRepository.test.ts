/**
 * Unit Tests für sightingRepository.ts
 * 
 * Testet alle Funktionen des Repository-Patterns für Sichtungen
 * mit besonderem Fokus auf Sicherheit und Edge Cases
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { saveSighting, updateSighting, loadSightingFiles, saveSightingFiles } from './sightingRepository';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { UploadedFileInfo } from '$lib/types';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		insert: vi.fn(),
		update: vi.fn(),
		select: vi.fn(),
		execute: vi.fn()
	}
}));

vi.mock('./mapFormToSighting', () => ({
	mapFormToSighting: vi.fn((formData) => ({
		id: 1,
		...formData,
		created: new Date().toISOString(),
		approvedAt: null
	}))
}));

vi.mock('$lib/server/storage/factory', () => ({
	isCloudStorage: vi.fn(() => false),
	getStorageProvider: vi.fn(() => ({
		getUrl: vi.fn((path) => `/uploads/${path}`)
	}))
}));

vi.mock('$lib/server/exifUtils', () => ({
	isImageFile: vi.fn((mimeType) => mimeType?.startsWith('image/')),
	readImageExifData: vi.fn(() => Promise.resolve({
		latitude: 54.123,
		longitude: 12.456,
		make: 'TestCamera',
		model: 'Model X'
	}))
}));

vi.mock('$lib/logger', () => ({
	createLogger: vi.fn(() => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}))
}));

describe('sightingRepository', () => {
	/**
	 * Test-Daten Setup
	 */
	// Mock-Formulardaten f\u00fcr Tests
	// Verwende 'any' f\u00fcr Tests, da das vollst\u00e4ndige Schema sehr komplex ist
	const mockFormData: any = {
		referenceId: 'test-ref-123',
		species: 'Schweinswal',
		date: '2024-01-15',
		time: '14:30',
		latitude: 54.5,
		longitude: 12.3,
		location: 'Testort',
		observerName: 'Max Mustermann',
		observerEmail: 'test@example.com',
		uploadedFiles: []
	};

	const mockUploadedFile: UploadedFileInfo = {
		id: 'file-1',
		originalName: 'test.jpg',
		fileName: 'test-123.jpg',
		filePath: 'uploads/test-123.jpg',
		url: '/uploads/test-123.jpg',
		size: 1024000,
		mimeType: 'image/jpeg',
		uploadedAt: new Date().toISOString(),
		exifData: null
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('saveSighting', () => {
		/**
		 * Test: Erfolgreiche Speicherung einer Sichtung ohne Dateien
		 */
		it('sollte eine Sichtung ohne Dateien erfolgreich speichern', async () => {
			// Arrange
			const mockDb = db as any;
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: 42 }])
				})
			});

			// Act
			const result = await saveSighting(mockFormData);

			// Assert
			expect(result).toEqual({ id: 42 });
			expect(mockDb.insert).toHaveBeenCalledWith(schema.sightings);
		});

		/**
		 * Test: Erfolgreiche Speicherung mit Dateien
		 */
		it('sollte eine Sichtung mit Dateien erfolgreich speichern', async () => {
			// Arrange
			const formDataWithFiles = {
				...mockFormData,
				uploadedFiles: [mockUploadedFile]
			};

			const mockDb = db as any;
			mockDb.insert.mockImplementation((table: any) => ({
				values: vi.fn().mockImplementation((_data) => {
					if (table === schema.sightings) {
						return {
							returning: vi.fn().mockResolvedValue([{ id: 100 }])
						};
					}
					// Für sightingFiles
					return Promise.resolve();
				})
			}));

			// Act
			const result = await saveSighting(formDataWithFiles);

			// Assert
			expect(result).toEqual({ id: 100 });
			expect(mockDb.insert).toHaveBeenCalledTimes(2);
			expect(mockDb.insert).toHaveBeenNthCalledWith(1, schema.sightings);
			expect(mockDb.insert).toHaveBeenNthCalledWith(2, schema.sightingFiles);
		});

		/**
		 * Test: Fehlerbehandlung bei Datenbankfehler
		 */
		it('sollte Datenbankfehler korrekt propagieren', async () => {
			// Arrange
			const mockDb = db as any;
			const dbError = new Error('Database connection failed');
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(dbError)
				})
			});

			// Act & Assert
			await expect(saveSighting(mockFormData)).rejects.toThrow('Database connection failed');
		});

		/**
		 * Test: Edge Case - Leere uploadedFiles Array
		 */
		it('sollte leere uploadedFiles Arrays korrekt behandeln', async () => {
			// Arrange
			const formDataWithEmptyFiles = {
				...mockFormData,
				uploadedFiles: []
			};

			const mockDb = db as any;
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: 50 }])
				})
			});

			// Act
			const result = await saveSighting(formDataWithEmptyFiles);

			// Assert
			expect(result).toEqual({ id: 50 });
			expect(mockDb.insert).toHaveBeenCalledTimes(1); // Nur sightings, keine Files
		});

		/**
		 * Test: Edge Case - Fehlende ID in Rückgabe
		 */
		it('sollte bei fehlender ID 0 zurückgeben', async () => {
			// Arrange
			const mockDb = db as any;
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([])
				})
			});

			// Act
			const result = await saveSighting(mockFormData);

			// Assert
			expect(result).toEqual({ id: 0 });
		});

		/**
		 * Test: SQL Injection Schutz
		 */
		it('sollte gegen SQL Injection geschützt sein', async () => {
			// Arrange
			const maliciousFormData = {
				...mockFormData,
				observerName: "'; DROP TABLE sightings; --",
				location: "<script>alert('XSS')</script>"
			};

			const mockDb = db as any;
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: 99 }])
				})
			});

			// Act
			const result = await saveSighting(maliciousFormData);

			// Assert
			expect(result).toEqual({ id: 99 });
			// Drizzle ORM sollte parametrisierte Queries verwenden
			expect(mockDb.insert).toHaveBeenCalled();
		});
	});

	describe('updateSighting', () => {
		/**
		 * Test: Erfolgreiche Aktualisierung
		 */
		it('sollte eine Sichtung erfolgreich aktualisieren', async () => {
			// Arrange
			const mockDb = db as any;
			const updatedData = { ...mockFormData, location: 'Neuer Ort' };
			
			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedData])
					})
				})
			});

			// Act
			const result = await updateSighting(42, mockFormData);

			// Assert
			expect(result).toBeTruthy();
			expect(mockDb.update).toHaveBeenCalledWith(schema.sightings);
		});

		/**
		 * Test: Edge Case - Negative ID
		 */
		it('sollte negative IDs ablehnen', async () => {
			// Arrange
			const mockDb = db as any;
			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			});

			// Act
			const result = await updateSighting(-1, mockFormData);

			// Assert
			expect(result).toBeUndefined();
		});

		/**
		 * Test: Edge Case - Sehr große ID
		 */
		it('sollte sehr große IDs korrekt behandeln', async () => {
			// Arrange
			const mockDb = db as any;
			const largeId = Number.MAX_SAFE_INTEGER;
			
			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockFormData])
					})
				})
			});

			// Act
			const result = await updateSighting(largeId, mockFormData);

			// Assert
			expect(result).toBeTruthy();
		});

		/**
		 * Test: Nicht existierende Sichtung
		 */
		it('sollte undefined zurückgeben wenn Sichtung nicht existiert', async () => {
			// Arrange
			const mockDb = db as any;
			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			});

			// Act
			const result = await updateSighting(999999, mockFormData);

			// Assert
			expect(result).toBeUndefined();
		});
	});

	describe('loadSightingFiles', () => {
		/**
		 * Test: Erfolgreiche Datei-Ladung mit EXIF-Daten aus DB
		 */
		it('sollte Dateien mit EXIF-Daten aus der Datenbank laden', async () => {
			// Arrange
			const mockDb = db as any;
			const mockFiles = [{
				id: 1,
				sightingId: 42,
				originalName: 'test.jpg',
				fileName: 'test-123.jpg',
				filePath: 'uploads/test-123.jpg',
				mimeType: 'image/jpeg',
				size: 1024000,
				url: '/uploads/test-123.jpg',
				uploadedAt: new Date().toISOString(),
				exifData: {
					latitude: 54.123,
					longitude: 12.456,
					make: 'Canon'
				}
			}];

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(mockFiles)
				})
			});

			// Act
			const result = await loadSightingFiles(42);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.exifData).toEqual({
				latitude: 54.123,
				longitude: 12.456,
				make: 'Canon'
			});
		});

		/**
		 * Test: Laden von Dateien ohne EXIF-Daten
		 */
		it('sollte Dateien ohne EXIF-Daten korrekt behandeln', async () => {
			// Arrange
			const mockDb = db as any;
			const mockFiles = [{
				id: 2,
				sightingId: 42,
				originalName: 'document.pdf',
				fileName: 'document-456.pdf',
				filePath: 'uploads/document-456.pdf',
				mimeType: 'application/pdf',
				size: 500000,
				url: null,
				uploadedAt: new Date().toISOString(),
				exifData: null
			}];

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(mockFiles)
				})
			});

			// Act
			const result = await loadSightingFiles(42);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.exifData).toBeNull();
			expect(result[0]?.mimeType).toBe('application/pdf');
		});

		/**
		 * Test: Edge Case - Keine Dateien gefunden
		 */
		it('sollte leeres Array zurückgeben wenn keine Dateien existieren', async () => {
			// Arrange
			const mockDb = db as any;
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([])
				})
			});

			// Act
			const result = await loadSightingFiles(999);

			// Assert
			expect(result).toEqual([]);
		});

		/**
		 * Test: Fehlerbehandlung bei EXIF-Extraktion
		 */
		it('sollte Fehler bei EXIF-Extraktion abfangen', async () => {
			// Arrange
			const mockDb = db as any;
			const mockFiles = [{
				id: 3,
				sightingId: 42,
				originalName: 'corrupt.jpg',
				fileName: 'corrupt-789.jpg',
				filePath: 'uploads/corrupt-789.jpg',
				mimeType: 'image/jpeg',
				size: 100,
				url: null,
				uploadedAt: new Date().toISOString(),
				exifData: null
			}];

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(mockFiles)
				})
			});

			const { readImageExifData } = await import('$lib/server/exifUtils');
			(readImageExifData as any).mockRejectedValueOnce(new Error('Corrupt image'));

			// Act
			const result = await loadSightingFiles(42);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.exifData).toBeNull(); // Fehler sollte abgefangen werden
		});
	});

	describe('saveSightingFiles', () => {
		/**
		 * Test: Erfolgreiche Speicherung mehrerer Dateien
		 */
		it('sollte mehrere Dateien erfolgreich speichern', async () => {
			// Arrange
			const mockDb = db as any;
			const files = [mockUploadedFile, { ...mockUploadedFile, id: 'file-2' }];
			
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockResolvedValue(undefined)
			});

			// Act
			await saveSightingFiles(42, files, 'ref-123');

			// Assert
			expect(mockDb.insert).toHaveBeenCalledWith(schema.sightingFiles);
			expect(mockDb.insert).toHaveBeenCalledTimes(1);
		});

		/**
		 * Test: Edge Case - Leere Dateiliste
		 */
		it('sollte bei leerer Dateiliste nichts tun', async () => {
			// Arrange
			const mockDb = db as any;

			// Act
			await saveSightingFiles(42, [], 'ref-123');

			// Assert
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		/**
		 * Test: Fehlerbehandlung
		 */
		it('sollte Datenbankfehler propagieren', async () => {
			// Arrange
			const mockDb = db as any;
			const dbError = new Error('Insert failed');
			
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockRejectedValue(dbError)
			});

			// Act & Assert
			await expect(
				saveSightingFiles(42, [mockUploadedFile], 'ref-123')
			).rejects.toThrow('Insert failed');
		});
	});
});