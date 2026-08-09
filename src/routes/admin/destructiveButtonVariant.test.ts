/**
 * @fileoverview Destruktive Aktionen im Admin tragen genau eine Variante.
 *
 * **Der Befund (8).** `design-system.md` nennt die hier vorgefundene
 * Kombination wörtlich als Anti-Pattern: „Nicht an einer Stelle `btn-warning`,
 * an anderer `btn-ghost text-error`." Genau das lag vor — die Detailansicht
 * löschte mit `btn btn-outline btn-error btn-sm`, die Tabellenzeile und die
 * Mobilkarte mit `btn text-error btn-ghost`, das Ansichten-Dropdown mit einem
 * nackten `text-error` am Menüeintrag.
 *
 * **Warum `btn` + `text-error` die richtige Bedingung ist und nicht
 * „`btn-ghost` verboten".** `btn-ghost` ist für zurückhaltende Aktionen völlig
 * korrekt und steht im Admin dutzendfach (Details anzeigen, Spam-Check,
 * Abbrechen). Verboten ist, eine **Schaltfläche** ihre destruktive Bedeutung
 * über die Textfarbe tragen zu lassen, statt über die dafür vorgesehene
 * Variante. Das ist zugleich ein Kontrast-Thema: `text-error` erreicht auf
 * `base-300` nur 4,13:1, und DaisyUIs Menü-Hover liegt noch darunter
 * (`base-content` zu 10 %). Die Rahmen-Variante entzieht sich beidem.
 *
 * `text-error` **ohne** `btn` bleibt erlaubt — als Icon-, Kanten- oder
 * Zahlenfarbe auf `base-100`/`base-200` (Totfund-Marker der Tabelle, die
 * Kennzeichnung in `AdminSightingView`, Abweichungen in der Statistik).
 *
 * Quelltext-Scan und kein DOM-Test: `e2e/design-tokens.spec.ts` prüft im DOM,
 * ob überhaupt Tokens verwendet werden — ob die **richtige Variante** gewählt
 * ist, sieht es nicht, und ein `hover:`-Zustand steht dort ohnehin nie an.
 * Dieselbe Bauart wie `adminPageHeadings.test.ts` nebenan.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WURZELN = ['.', '../../lib/components/admin'].map((p) =>
	fileURLToPath(new URL(p, import.meta.url))
);

function svelteDateien(verzeichnis: string): string[] {
	return readdirSync(verzeichnis).flatMap((eintrag) => {
		const pfad = join(verzeichnis, eintrag);
		if (statSync(pfad).isDirectory()) return svelteDateien(pfad);
		return pfad.endsWith('.svelte') ? [pfad] : [];
	});
}

/**
 * Alle Klassenlisten einer Datei — sowohl `class="…"` als auch die
 * Zeichenketten-Anteile eines `class={…}`-Ausdrucks. Der zweite Fall ist nicht
 * theoretisch: Der Filter-Knopf derselben Seite baut seine Variante so
 * zusammen.
 */
function klassenlisten(quelle: string): string[] {
	return [
		...[...quelle.matchAll(/class="([^"]*)"/g)],
		...[...quelle.matchAll(/class=\{([^}]*)\}/g)]
	].map((treffer) => treffer[1] ?? '');
}

const dateien = WURZELN.flatMap(svelteDateien);

describe('Admin — destruktive Schaltflächen tragen die kanonische Variante', () => {
	it('findet überhaupt Dateien zum Prüfen', () => {
		// Ohne diese Gegenprobe wäre ein kaputter Pfad ein grüner Test.
		expect(dateien.length).toBeGreaterThan(10);
	});

	it('kombiniert nirgends btn mit text-error', () => {
		const verstoesse = dateien.flatMap((pfad) =>
			klassenlisten(readFileSync(pfad, 'utf-8'))
				.filter((liste) => /\bbtn\b/.test(liste) && /\btext-error\b/.test(liste))
				.map((liste) => `${pfad.split('/src/')[1]}: ${liste.trim()}`)
		);
		expect(verstoesse).toEqual([]);
	});

	it('löscht in Tabelle, Karte und Detailansicht mit derselben Variante', () => {
		// Der Scan oben verbietet die falsche Variante; dieser Test verlangt die
		// richtige. Ohne ihn wäre auch „gar kein Löschen-Knopf mehr" grün.
		for (const pfad of [
			'./sichtungen/SichtungenTable.svelte',
			'./sichtungen/SichtungenCards.svelte',
			'./[id]/+page.svelte'
		]) {
			const quelle = readFileSync(fileURLToPath(new URL(pfad, import.meta.url)), 'utf-8');
			const loeschen = klassenlisten(quelle).filter((liste) => /\bbtn-error\b/.test(liste));
			expect(loeschen.length, pfad).toBeGreaterThan(0);
			for (const liste of loeschen) {
				expect(liste, pfad).toMatch(/\bbtn-outline\b/);
			}
		}
	});
});
