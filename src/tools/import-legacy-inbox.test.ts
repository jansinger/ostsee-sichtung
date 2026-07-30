import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readdir } from 'node:fs/promises';
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

		expect(ergebnis).toEqual({ uebernommen: 1, fehlgeschlagen: 0 });
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

		expect(ergebnis).toEqual({ uebernommen: 0, fehlgeschlagen: 1 });
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

		expect(ergebnis).toEqual({ uebernommen: 1, fehlgeschlagen: 1 });
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

		expect(ergebnis).toEqual({ uebernommen: 0, fehlgeschlagen: 1 });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual(['000001__a.json']);
	});
});
