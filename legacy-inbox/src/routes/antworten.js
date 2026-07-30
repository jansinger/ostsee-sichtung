// @ts-nocheck — reines JavaScript ohne Typdeklarationen (siehe CLAUDE.md, Legacy REST API);
// erst seit Aufgabe 9 von src/tests/contract importiert und damit von tsc erreichbar.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { antworteJson } from '../respond.js';

const DATEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

// Einmal gelesen und im Speicher gehalten: Die Tabelle ist eingefroren und
// ändert sich zur Laufzeit nicht.
const zwischenspeicher = new Map();

async function ladeTabelle(datei) {
	if (!zwischenspeicher.has(datei)) {
		zwischenspeicher.set(datei, JSON.parse(await readFile(path.join(DATEN, datei), 'utf8')));
	}
	return zwischenspeicher.get(datei);
}

export async function antworten(req, res) {
	const pfad = new URL(req.url, 'http://localhost').pathname;
	const datei = pfad.startsWith('/en/') ? 'antworten.en.json' : 'antworten.de.json';

	antworteJson(res, 200, await ladeTabelle(datei), {
		'Cache-Control': 'public, max-age=300'
	});
}
