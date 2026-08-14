import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { setupMapPage } from './fixtures/mapSetup';

/**
 * axe-scan.spec.ts — automatisierter WCAG-Scan der öffentlichen Routen.
 *
 * **Warum zusätzlich zu den handgebauten Guards:** `design-tokens.spec.ts`,
 * `form-a11y.spec.ts` und `map-accessibility.spec.ts` prüfen, was beim Bauen
 * bedacht wurde — Kontrast-Tokens, Fokus-Ring, Karten-Tastatur. axe-core
 * prüft die Fehlerklassen, für die es hier keinen eigenen Guard gibt
 * (ARIA-Attribut-Gültigkeit, Namensberechnung, Landmark-Struktur,
 * Listen-Semantik, …) und fängt damit Regressionen in NEUEM Markup, das
 * keiner der spezifischen Guards kennt.
 *
 * Geprüft werden die WCAG-2.1-A/AA-Regeln (Tags unten) — das ist das
 * dokumentierte Zielniveau (`docs/DESIGN_GUIDE.md`, Leitprinzip 6) und das
 * nach § 14 LBGG M-V / BITVO M-V über EN 301 549 geforderte Niveau.
 * Best-Practice-Regeln laufen bewusst nicht mit: Sie sind kein
 * Konformitätskriterium und würden den Guard mit Meinungsfragen verwässern.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Öffentliche Routen; die Karte wartet zusätzlich auf ihren Fertig-Zustand. */
const ROUTEN: { pfad: string; name: string }[] = [
	{ pfad: '/?meldung=lebend', name: 'Meldeformular (Schritt 1)' },
	{ pfad: '/bestimmungshilfe', name: 'Bestimmungshilfe' },
	{ pfad: '/about', name: 'Über das Projekt' },
	{ pfad: '/barrierefreiheit', name: 'Erklärung zur Barrierefreiheit' },
	{ pfad: '/map', name: 'Sichtungskarte' }
];

/** Kompakte, lesbare Fehlermeldung statt des rohen axe-JSON. */
function beschreibeVerstoesse(
	violations: { id: string; impact?: string | null; help: string; nodes: { target: unknown[] }[] }[]
): string {
	return violations
		.map(
			(v) =>
				`${v.id} (${v.impact ?? 'unbekannt'}): ${v.help}\n` +
				v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n')
		)
		.join('\n');
}

test.describe('axe-core — öffentliche Routen (WCAG 2.1 A/AA)', () => {
	for (const route of ROUTEN) {
		test(`${route.name} ist ohne axe-Verstöße`, async ({ page }) => {
			if (route.pfad === '/map') {
				// Die Karte rendert asynchron; das Map-Fixture (gemockte Sichtungen,
				// Warten auf beide Ladephasen) stellt den Fertig-Zustand her, den
				// auch die übrigen Map-Specs scannen.
				await setupMapPage(page);
			} else {
				await page.goto(route.pfad);
			}

			const ergebnis = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

			expect(
				ergebnis.violations,
				`axe-Verstöße auf ${route.pfad}:\n${beschreibeVerstoesse(ergebnis.violations)}`
			).toEqual([]);
		});
	}
});
