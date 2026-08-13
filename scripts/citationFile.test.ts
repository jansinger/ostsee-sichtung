import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Wächter über `CITATION.cff`.
 *
 * Die Datei trägt eine Versionsnummer, und eine falsche Versionsnummer in einer
 * Zitierangabe ist schlimmer als keine: Sie schickt jemanden auf einen Stand,
 * den es so nie gab. Gepflegt wird sie von release-please über die Anmerkungen
 * `x-release-please-version` und `x-release-please-date`; dieser Test prüft,
 * dass die Kopplung intakt ist — verschwindet eine Anmerkung beim Bearbeiten,
 * aktualisiert release-please die Zeile still nicht mehr.
 *
 * Absichtlich ohne YAML-Bibliothek: Das Projekt hat keine, und eine
 * Abhängigkeit für vier Felder wäre unverhältnismäßig.
 */
const wurzel = process.cwd();
const cff = readFileSync(join(wurzel, 'CITATION.cff'), 'utf-8');
const paketVersion = JSON.parse(readFileSync(join(wurzel, 'package.json'), 'utf-8')).version;

const feld = (name: string): string | undefined =>
	new RegExp(`^${name}: (.+?)(?: #.*)?$`, 'm').exec(cff)?.[1]?.trim().replace(/^'|'$/g, '');

describe('CITATION.cff', () => {
	it('nennt die Pflichtfelder des Citation File Format', () => {
		for (const name of ['cff-version', 'message', 'title', 'type', 'license']) {
			expect(feld(name), `CITATION.cff: ${name} fehlt`).toBeDefined();
		}
		expect(cff).toMatch(/^authors:$/m);
	});

	it('führt dieselbe Version wie package.json', () => {
		expect(feld('version')).toBe(paketVersion);
	});

	it('behält die release-please-Marker', () => {
		// Ohne sie bleibt die Version beim nächsten Release stehen — und zwar
		// lautlos, weil release-please die Zeile dann schlicht nicht findet.
		expect(cff).toMatch(/^version: .+ # x-release-please-version$/m);
		expect(cff).toMatch(/^date-released: .+ # x-release-please-date$/m);
	});

	it('steht in den extra-files von release-please', () => {
		// Der Marker allein reicht nicht: release-please sieht nur Dateien an, die
		// in der Konfiguration stehen.
		const konfig = JSON.parse(readFileSync(join(wurzel, 'release-please-config.json'), 'utf-8'));
		expect(konfig.packages['.']['extra-files']).toContain('CITATION.cff');
	});

	it('trägt ein Freigabedatum im ISO-Format', () => {
		expect(feld('date-released')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
