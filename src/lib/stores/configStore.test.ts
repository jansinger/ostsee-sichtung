import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	PUBLIC_UPLOAD_ALLOWED_TYPES,
	PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES
} from '$lib/constants/uploadDefaults';

vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// browser-Flag steuert ob fetch aufgerufen wird oder der SSR-Fallback greift
// Wird pro Test über vi.doMock / vi.resetModules variiert
vi.mock('$app/environment', () => ({ browser: false }));

describe('configStore', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	describe('getUploadConfig() — Server-Seite (browser = false)', () => {
		it('gibt SSR-Fallback zurück ohne fetch aufzurufen', async () => {
			const { getUploadConfig } = await import('./configStore');

			const config = await getUploadConfig();

			expect(fetch).not.toHaveBeenCalled();
			expect(config.allowedTypes).toContain('image/jpeg');
			expect(config.maxFileSize).toBeGreaterThan(0);
			expect(config.maxFiles).toBe(20);
		});
	});

	describe('getUploadConfig() — Browser-Seite (browser = true)', () => {
		beforeEach(() => {
			// Für jeden Test in dieser Gruppe browser = true setzen
			vi.doMock('$app/environment', () => ({ browser: true }));
		});

		it('ruft fetch mit korrekter URL auf', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						allowedTypes: ['image/jpeg', 'image/png'],
						maxFileSizeBytes: 10 * 1024 * 1024,
						accept: 'image/*'
					})
			} as Response);

			const { getUploadConfig } = await import('./configStore');
			await getUploadConfig();

			expect(fetch).toHaveBeenCalledWith('/api/config/upload');
		});

		it('transformiert Server-Antwort korrekt in ValidationPreset', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						allowedTypes: ['image/jpeg'],
						maxFileSizeBytes: 5 * 1024 * 1024,
						accept: 'image/jpeg'
					})
			} as Response);

			const { getUploadConfig } = await import('./configStore');
			const config = await getUploadConfig();

			expect(config.allowedTypes).toEqual(['image/jpeg']);
			expect(config.maxFileSize).toBe(5 * 1024 * 1024);
			expect(config.accept).toBe('image/jpeg');
		});

		it('gibt den restriktiven öffentlichen Fallback zurück wenn fetch fehlschlägt', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			const { getUploadConfig } = await import('./configStore');
			const config = await getUploadConfig();

			// Der Fallback muss der öffentlichen Server-Konfiguration entsprechen,
			// sonst nimmt die Dropzone Dateien an, die der Server ablehnt.
			expect(config.allowedTypes).toEqual([...PUBLIC_UPLOAD_ALLOWED_TYPES]);
			expect(config.maxFileSize).toBe(PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES);
			expect(config.allowedTypes.some((type) => type.startsWith('video/'))).toBe(false);
		});

		it('gibt Fallback zurück bei HTTP-Fehler-Status', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: 'Service Unavailable'
			} as Response);

			const { getUploadConfig } = await import('./configStore');
			const config = await getUploadConfig();

			// Fallback-Werte
			expect(config.allowedTypes).toContain('image/jpeg');
			expect(config.maxFiles).toBe(20);
		});

		it('nutzt Cache bei zweitem Aufruf (kein zweites fetch)', async () => {
			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						allowedTypes: ['image/jpeg'],
						maxFileSizeBytes: 1024,
						accept: 'image/*'
					})
			} as Response);

			const { getUploadConfig } = await import('./configStore');
			await getUploadConfig();
			await getUploadConfig();

			expect(fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('clearUploadConfigCache()', () => {
		it('erzwingt nach clearCache() einen neuen fetch', async () => {
			vi.doMock('$app/environment', () => ({ browser: true }));

			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						allowedTypes: ['image/jpeg'],
						maxFileSizeBytes: 1024,
						accept: 'image/*'
					})
			} as Response);

			const { getUploadConfig, clearUploadConfigCache } = await import('./configStore');
			await getUploadConfig();
			clearUploadConfigCache();
			await getUploadConfig();

			expect(fetch).toHaveBeenCalledTimes(2);
		});

		it('wirft keinen Fehler wenn Cache bereits leer ist', async () => {
			const { clearUploadConfigCache } = await import('./configStore');
			expect(() => clearUploadConfigCache()).not.toThrow();
			expect(() => clearUploadConfigCache()).not.toThrow();
		});
	});
});
