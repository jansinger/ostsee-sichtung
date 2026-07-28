import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	assertLocalStorage,
	removeFile,
	parseCliOptions,
	resolveConnectionString
} from './cleanup-orphaned-uploads';

describe('parseCliOptions', () => {
	it('verwendet 24h und Dry-Run als Vorgabe', () => {
		const options = parseCliOptions([], {});

		expect(options.retentionMs).toBe(24 * 60 * 60 * 1000);
		expect(options.execute).toBe(false);
		expect(options.verbose).toBe(false);
	});

	it('übernimmt --older-than', () => {
		expect(parseCliOptions(['--older-than=7d'], {}).retentionMs).toBe(7 * 24 * 60 * 60 * 1000);
	});

	it('schaltet mit --execute scharf', () => {
		expect(parseCliOptions(['--execute'], {}).execute).toBe(true);
	});

	it('erkennt --verbose', () => {
		expect(parseCliOptions(['--verbose'], {}).verbose).toBe(true);
	});

	it('löst das Upload-Verzeichnis wie die Anwendung auf', () => {
		expect(parseCliOptions([], {}).uploadsDir).toBe(resolve('uploads'));
	});

	it('übernimmt --uploads-dir', () => {
		expect(parseCliOptions(['--uploads-dir=/data/uploads'], {}).uploadsDir).toBe('/data/uploads');
	});

	it('weist ein unbekanntes Argument zurück', () => {
		expect(() => parseCliOptions(['--force'], {})).toThrow(/Unbekanntes Argument/);
	});

	it('weist eine ungültige Frist zurück', () => {
		expect(() => parseCliOptions(['--older-than=morgen'], {})).toThrow(/Ungültige Frist/);
	});
});

describe('resolveConnectionString', () => {
	it('bevorzugt DATABASE_POSTGRES_URL', () => {
		const env = {
			DATABASE_POSTGRES_URL: 'postgresql://a/1',
			DATABASE_URL: 'postgresql://b/2'
		};

		expect(resolveConnectionString(env)).toBe('postgresql://a/1');
	});

	it('fällt auf DATABASE_URL zurück', () => {
		expect(resolveConnectionString({ DATABASE_URL: 'postgresql://b/2' })).toBe('postgresql://b/2');
	});

	it('wirft, wenn keine Verbindung gesetzt ist — es wird nicht geraten', () => {
		expect(() => resolveConnectionString({})).toThrow(/DATABASE_POSTGRES_URL/);
	});

	it('nennt in der Fehlermeldung beide akzeptierten Variablen', () => {
		// Die Meldung nannte nur DATABASE_POSTGRES_URL, obwohl DATABASE_URL
		// ebenfalls akzeptiert wird — im Betrieb irreführend.
		expect(() => resolveConnectionString({})).toThrow(/DATABASE_URL/);
	});
});

describe('assertLocalStorage', () => {
	it('lässt einen leeren STORAGE_PROVIDER durch', () => {
		expect(() => assertLocalStorage({})).not.toThrow();
	});

	it('lässt local durch', () => {
		expect(() => assertLocalStorage({ STORAGE_PROVIDER: 'local' })).not.toThrow();
	});

	it('bricht bei vercel-blob ab', () => {
		expect(() => assertLocalStorage({ STORAGE_PROVIDER: 'vercel-blob' })).toThrow(
			/nur für local storage/i
		);
	});
});

describe('removeFile', () => {
	it('meldet eine bereits fehlende Datei als nicht gelöscht, ohne zu werfen', async () => {
		// Ziel erreicht: Die Datei ist weg. Würde das als Fehlschlag zählen,
		// meldete jeder Lauf über einem aufgeräumten Bestand Fehler.
		await expect(removeFile('/nicht/vorhanden/datei.jpg')).resolves.toBe(false);
	});
});
