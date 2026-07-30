import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readdir, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { importiere } from './import-legacy-inbox.js';

let verzeichnis: string;

async function legeUmschlagAn(name: string, payload: Record<string, unknown> | null) {
	await writeFile(
		path.join(verzeichnis, 'posteingang', name),
		JSON.stringify({
			empfangen_am: '2026-07-30T09:12:33.123Z',
			lfd_nr: 1,
			quelle: { ip: '1.2.3.4', user_agent: 'test', content_type: 'application/json' },
			roh: JSON.stringify(payload),
			abgeschnitten: false,
			payload,
			validierung: { gueltig: payload !== null, fehler: {} }
		})
	);
}

beforeEach(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'import-'));
	await mkdir(path.join(verzeichnis, 'posteingang'), { recursive: true });
	await mkdir(path.join(verzeichnis, 'importiert'), { recursive: true });
});

afterEach(async () => {
	await rm(verzeichnis, { recursive: true, force: true });
});

describe('importiere', () => {
	it('reicht den Payload unverändert an das Mapping der Hauptanwendung', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 3, vorname: 'Jörg' });
		const gemappt: unknown[] = [];

		await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: (daten: unknown) => {
				gemappt.push(daten);
				return { totalCount: 3 };
			},
			speichere: async () => ({ id: 4711 })
		});

		expect(gemappt).toEqual([{ anzahl_gesamt: 3, vorname: 'Jörg' }]);
	});

	it('verschiebt Übernommenes nach importiert/', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });

		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => ({ id: 1 })
		});

		expect(ergebnis).toEqual({ uebernommen: 1, fehlgeschlagen: 0, moveFailure: null });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual([]);
		expect(await readdir(path.join(verzeichnis, 'importiert'))).toEqual(['000001__a.json']);
	});

	it('lässt Fehlgeschlagenes liegen, damit ein zweiter Lauf es erneut versucht', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });

		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => {
				throw new Error('Datenbank nicht erreichbar');
			}
		});

		expect(ergebnis).toEqual({ uebernommen: 0, fehlgeschlagen: 1, moveFailure: null });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual(['000001__a.json']);
	});

	it('bricht bei einem Fehler nicht ab, sondern nimmt den Rest mit', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });
		await legeUmschlagAn('000002__b.json', { anzahl_gesamt: 2 });

		let aufruf = 0;
		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => {
				aufruf++;
				if (aufruf === 1) throw new Error('einmaliger Fehler');
				return { id: 2 };
			}
		});

		expect(ergebnis).toEqual({ uebernommen: 1, fehlgeschlagen: 1, moveFailure: null });
	});

	it('legt bei einem zweiten Lauf nichts doppelt an', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });
		let aufrufe = 0;
		const optionen = {
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => {
				aufrufe++;
				return { id: 1 };
			}
		};

		await importiere(optionen);
		await importiere(optionen);

		expect(aufrufe).toBe(1);
	});

	it('übersetzt sonstige_auffaelligkeiten in die Schreibweise der Hauptanwendung', async () => {
		await legeUmschlagAn('000001__a.json', {
			anzahl_gesamt: 1,
			sonstige_auffaelligkeiten: 'Sehr ruhig'
		});
		let gemappt: Record<string, unknown> = {};

		await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: (daten: Record<string, unknown>) => {
				gemappt = daten;
				return { totalCount: 1 };
			},
			speichere: async () => ({ id: 1 })
		});

		expect(gemappt['sonstige_auffälligkeiten']).toBe('Sehr ruhig');
		expect(gemappt).not.toHaveProperty('sonstige_auffaelligkeiten');
	});

	it('rührt Umschläge ohne Payload nicht an', async () => {
		await legeUmschlagAn('000001__a.json', null);

		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => ({ id: 1 })
		});

		expect(ergebnis).toEqual({ uebernommen: 0, fehlgeschlagen: 1, moveFailure: null });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual(['000001__a.json']);
	});

	it('bricht den Lauf ab, wenn die Sichtung gespeichert wurde, das Verschieben nach importiert/ aber dauerhaft scheitert', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });
		const fehlerSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => ({ id: 4711 }),
			renameFile: async () => {
				throw new Error('EACCES: permission denied');
			},
			renameRetryDelayMs: 0
		});

		expect(ergebnis.uebernommen).toBe(0);
		expect(ergebnis.fehlgeschlagen).toBe(0);
		expect(ergebnis.moveFailure).toEqual({
			file: '000001__a.json',
			sightingId: 4711,
			message: expect.stringContaining('EACCES')
		});

		// Datei bleibt im Posteingang liegen — die Sichtung existiert bereits in
		// der DB, ein erneuter Lauf würde sie sonst doppelt anlegen.
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual(['000001__a.json']);
		expect(await readdir(path.join(verzeichnis, 'importiert'))).toEqual([]);

		const fehlerZeile = fehlerSpy.mock.calls.map((call) => String(call[0])).join('\n');
		expect(fehlerZeile).toContain('000001__a.json');
		expect(fehlerZeile).toContain('4711');
		expect(fehlerZeile).toContain('importiert/');

		fehlerSpy.mockRestore();
	});

	it('verschiebt die Datei trotzdem, wenn das Verschieben erst beim Wiederholungsversuch klappt', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });

		let versuche = 0;
		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => ({ id: 42 }),
			renameFile: async (quelle: string, ziel: string) => {
				versuche++;
				if (versuche === 1) throw new Error('EBUSY: resource busy');
				await rename(quelle, ziel);
			},
			renameRetryDelayMs: 0
		});

		expect(versuche).toBe(2);
		expect(ergebnis).toEqual({ uebernommen: 1, fehlgeschlagen: 0, moveFailure: null });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual([]);
		expect(await readdir(path.join(verzeichnis, 'importiert'))).toEqual(['000001__a.json']);
	});

	it('verarbeitet bei dauerhaftem Verschiebefehler auf der ersten Datei die folgenden Dateien nicht mehr', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });
		await legeUmschlagAn('000002__b.json', { anzahl_gesamt: 2 });
		vi.spyOn(console, 'error').mockImplementation(() => {});

		let speicherAufrufe = 0;
		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => {
				speicherAufrufe++;
				return { id: speicherAufrufe };
			},
			renameFile: async () => {
				throw new Error('ENOSPC: no space left on device');
			},
			renameRetryDelayMs: 0
		});

		// Nur die erste Datei wurde überhaupt gespeichert — die zweite wurde
		// gar nicht erst angefasst, weil der Lauf vorher abgebrochen ist.
		expect(speicherAufrufe).toBe(1);
		expect(ergebnis.moveFailure?.file).toBe('000001__a.json');
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual([
			'000001__a.json',
			'000002__b.json'
		]);

		vi.restoreAllMocks();
	});
});
