import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { erstelleStore } from './store.js';

let verzeichnis;
let store;

const umschlag = (zusatz = {}) => ({
	empfangen_am: '2026-07-30T09:12:33.123Z',
	quelle: { ip: '1.2.3.4', user_agent: 'test', content_type: 'application/json' },
	roh: '{"anzahl_gesamt":1}',
	abgeschnitten: false,
	payload: { anzahl_gesamt: 1 },
	validierung: { gueltig: true, fehler: {} },
	...zusatz
});

beforeEach(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-'));
	store = await erstelleStore({ datenVerzeichnis: verzeichnis });
	await store.initialisiere();
});

afterEach(async () => {
	await chmod(verzeichnis, 0o700).catch(() => {});
	await rm(verzeichnis, { recursive: true, force: true });
});

describe('erstelleStore', () => {
	it('legt die drei Verzeichnisse an', async () => {
		const inhalt = (await readdir(verzeichnis)).sort();
		expect(inhalt).toEqual(['abgewiesen', 'importiert', 'posteingang']);
	});

	it('schreibt den Umschlag vollständig und lesbar', async () => {
		const { lfdNr, pfad } = await store.schreibe(umschlag(), 'posteingang');

		expect(lfdNr).toBe(1);
		const gelesen = JSON.parse(await readFile(pfad, 'utf8'));
		expect(gelesen.payload).toEqual({ anzahl_gesamt: 1 });
		expect(gelesen.lfd_nr).toBe(1);
		expect(gelesen.roh).toBe('{"anzahl_gesamt":1}');
	});

	it('legt Ungültiges in abgewiesen/ ab', async () => {
		const { pfad } = await store.schreibe(
			umschlag({ validierung: { gueltig: false, fehler: { name: ['fehlt'] } } }),
			'abgewiesen'
		);
		expect(pfad).toContain(`${path.sep}abgewiesen${path.sep}`);
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual([]);
	});

	it('hinterlässt keine .tmp-Dateien', async () => {
		await store.schreibe(umschlag(), 'posteingang');
		const dateien = await readdir(path.join(verzeichnis, 'posteingang'));
		expect(dateien.filter((d) => d.endsWith('.tmp'))).toEqual([]);
		expect(dateien).toHaveLength(1);
	});

	it('vergibt bei gleichzeitigen Schreibvorgängen eindeutige Nummern und Dateinamen', async () => {
		const ergebnisse = await Promise.all(
			Array.from({ length: 25 }, () => store.schreibe(umschlag(), 'posteingang'))
		);

		const nummern = ergebnisse.map((e) => e.lfdNr).sort((a, b) => a - b);
		expect(nummern).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));

		const dateien = await readdir(path.join(verzeichnis, 'posteingang'));
		expect(new Set(dateien).size).toBe(25);
	});

	it('setzt die Nummerierung nach einem Neustart fort', async () => {
		await store.schreibe(umschlag(), 'posteingang');
		await store.schreibe(umschlag(), 'abgewiesen');

		const neu = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await neu.initialisiere();
		const { lfdNr } = await neu.schreibe(umschlag(), 'posteingang');

		expect(lfdNr).toBe(3);
	});

	it('wirft, wenn nicht geschrieben werden kann', async () => {
		await chmod(path.join(verzeichnis, 'posteingang'), 0o500);
		await expect(store.schreibe(umschlag(), 'posteingang')).rejects.toThrow();
	});

	it('meldet über istBeschreibbar, wenn das Verzeichnis gesperrt ist', async () => {
		expect(await store.istBeschreibbar()).toBe(true);
		await chmod(path.join(verzeichnis, 'posteingang'), 0o500);
		expect(await store.istBeschreibbar()).toBe(false);
	});
});
