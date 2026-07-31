import { describe, expect, it } from 'vitest';
import { maxUploadSizeFor } from './uploadLimits';

const LIMITS = {
	maxFileSize: 10 * 1024 * 1024,
	maxVideoFileSize: 100 * 1024 * 1024
};

describe('maxUploadSizeFor', () => {
	it('gibt für Bilder die allgemeine Grenze zurück', () => {
		expect(maxUploadSizeFor('image/jpeg', LIMITS)).toBe(10 * 1024 * 1024);
	});

	it('gibt für Videos die Videogrenze zurück', () => {
		expect(maxUploadSizeFor('video/mp4', LIMITS)).toBe(100 * 1024 * 1024);
		expect(maxUploadSizeFor('video/quicktime', LIMITS)).toBe(100 * 1024 * 1024);
	});

	it('behandelt unbekannte Typen wie Bilder — die restriktivere Grenze', () => {
		expect(maxUploadSizeFor('application/pdf', LIMITS)).toBe(10 * 1024 * 1024);
		expect(maxUploadSizeFor('', LIMITS)).toBe(10 * 1024 * 1024);
	});

	it('ist unempfindlich gegen Groß-/Kleinschreibung', () => {
		expect(maxUploadSizeFor('VIDEO/MP4', LIMITS)).toBe(100 * 1024 * 1024);
	});
});
