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

// Befund 1 (Review Task 4): PUT /api/config validiert `value` nur gegen
// `undefined`. Landet dort ein nicht in eine Zahl wandelbarer Wert, liefert
// ServerConfigService.getNumber() per `Number(value)` NaN. Der Torwächter
// prüft `file.size > maxSize` — und `x > NaN` ist in JavaScript immer
// `false`, die 413-Prüfung würde also für keine Datei mehr greifen. Diese
// Funktion ist der einzige Engpass, durch den Torwächter, Auskunfts-Endpunkt
// und Client-Validierung laufen — die Absicherung gehört hierher.
describe('maxUploadSizeFor — kaputte Konfigurationswerte', () => {
	it('behandelt NaN nicht als „unbegrenzt", sondern sperrt (0 Bytes erlaubt)', () => {
		const brokenLimits = { maxFileSize: NaN, maxVideoFileSize: 100 * 1024 * 1024 };
		expect(maxUploadSizeFor('image/jpeg', brokenLimits)).toBe(0);
	});

	it('behandelt negative Grenzen als Sperre, nicht als Freibrief', () => {
		const brokenLimits = { maxFileSize: -1, maxVideoFileSize: 100 * 1024 * 1024 };
		expect(maxUploadSizeFor('image/jpeg', brokenLimits)).toBe(0);
	});

	it('behandelt 0 weiterhin als gültige Sperre — keine Datei > 0 Byte kommt durch', () => {
		const zeroLimits = { maxFileSize: 0, maxVideoFileSize: 100 * 1024 * 1024 };
		expect(maxUploadSizeFor('image/jpeg', zeroLimits)).toBe(0);
	});

	it('sperrt auch die Videogrenze bei kaputtem Wert, ohne die Bildgrenze zu berühren', () => {
		const brokenLimits = { maxFileSize: 10 * 1024 * 1024, maxVideoFileSize: NaN };
		expect(maxUploadSizeFor('video/mp4', brokenLimits)).toBe(0);
		expect(maxUploadSizeFor('image/jpeg', brokenLimits)).toBe(10 * 1024 * 1024);
	});

	it('behandelt Infinity als Sperre — kein Wert ist tatsächlich „unbegrenzt"', () => {
		const brokenLimits = { maxFileSize: Infinity, maxVideoFileSize: 100 * 1024 * 1024 };
		expect(maxUploadSizeFor('image/jpeg', brokenLimits)).toBe(0);
	});
});
