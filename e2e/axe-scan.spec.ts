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

/**
 * Was axe **nicht entscheiden** konnte, je Route und Regel — mit Obergrenze.
 *
 * **Warum das hier steht.** Ein axe-Lauf liefert drei Töpfe: `violations`,
 * `passes` und `incomplete`. Geprüft wurde bis zum 2026-08-14 nur der erste;
 * `incomplete` sah niemand an. Das ist keine Formalie: Auf `/about` standen
 * zwei Handlungsaufforderungs-Knöpfe mit `btn-secondary btn-outline` (2,68:1),
 * und dieser Scan war **grün** — die Knöpfe lagen unter `incomplete`, weil axe
 * hinter dem durchsichtigen Grund einen Verlauf sah und die Hintergrundfarbe
 * nicht bestimmen konnte. Gefunden hat sie am Ende der Klassen-Scan
 * (`OUTLINE_STATUS_COLOR` in `helpers/bannedClasses.ts`), nicht dieser Test.
 *
 * Ein Guard, der ein Drittel seines Ergebnisses verwirft, erzeugt damit genau
 * die Deckung, die es nicht gibt — dieselbe Fehlerklasse, die `bannedClasses.ts`
 * an mehreren Stellen beschreibt, nur an der **Auswertung** statt an der Regel.
 *
 * **Warum eine Obergrenze und keine Null.** Die verbleibenden Fälle sind für
 * axe grundsätzlich unentscheidbar (Verlauf, Hintergrundbild, Bildknoten hinter
 * dem Text, überlappende Elemente). Sie verschwinden nicht durch Aufräumen, und
 * eine Null-Erwartung wäre dauerhaft rot und damit in vier Wochen abgeschaltet.
 * Die Grenze ist deshalb ein **Deckel, kein Ziel**: Kommt eine Regel dazu oder
 * steigt die Zahl, gibt es mehr Stellen, an denen niemand etwas weiß. Wer eine
 * Zahl anhebt, muss die neuen Knoten vorher angesehen haben.
 *
 * **Was dieser Deckel ausdrücklich nicht leistet.** Er bemerkt *neue*
 * unentscheidbare Stellen, nicht eine Farbänderung *innerhalb* einer bereits
 * gelisteten. Nachgemessen am selben Fall: `/about` steht mit und ohne die
 * fehlerhaften CTA-Klassen bei 25 Knoten — die Knöpfe liegen so oder so über
 * einem Verlauf, nur ihre Textfarbe unterschied sich. Diesen Fund kann hier
 * grundsätzlich nichts leisten; dafür ist der Klassen-Scan zuständig. Die
 * Arbeitsteilung ist damit benannt statt unterstellt.
 *
 * **Wer diese Fälle stattdessen entscheidet:** die eigenen Messungen. Kontrast
 * misst `design-tokens.spec.ts` mit `helpers/contrast.ts` im Browser (inkl.
 * Backdrop-Komposition, die axe hier gerade fehlt); die Klassenkombinationen
 * deckt der DOM-Scan derselben Datei ab.
 */
const UNENTSCHIEDEN: Record<string, { regel: string; hoechstens: number; grund: string }[]> = {
	'/?meldung=lebend': [
		{
			regel: 'color-contrast',
			hoechstens: 3,
			grund:
				'Karten-Hinweis, GPS-Format-Wahl und Weiter-Knopf liegen auf Verlauf bzw. Hintergrundbild.'
		}
	],
	'/bestimmungshilfe': [
		{
			regel: 'color-contrast',
			hoechstens: 10,
			grund: 'Artbadges in den Disclosure-Köpfen liegen über den Artfotos.'
		}
	],
	'/about': [
		{
			regel: 'color-contrast',
			hoechstens: 25,
			grund:
				'Die Karten der Seite tragen Theme-Verläufe (from-primary/5 …); axe kann darüber keine Fläche bestimmen. Hier lagen die beiden CTA-Knöpfe, die dieser Scan nicht meldete.'
		}
	],
	'/barrierefreiheit': [],
	'/map': [
		{
			regel: 'color-contrast',
			hoechstens: 9,
			grund: 'Kartenkacheln und OpenLayers-Attribution — fremdes Bildmaterial hinter dem Text.'
		},
		{
			regel: 'link-in-text-block',
			hoechstens: 2,
			grund:
				'Attributionslinks von OpenLayers/OpenSeaMap, überlappende Steuerelemente. Fremdes Markup.'
		}
	]
};

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

			/* Zweiter Topf: was axe nicht entscheiden konnte. Begründung an
			   UNENTSCHIEDEN oben — ohne diese Prüfung meldet der Test Konformität
			   für Elemente, über die er nichts weiß. */
			const erlaubt = UNENTSCHIEDEN[route.pfad] ?? [];
			for (const gruppe of ergebnis.incomplete) {
				const eintrag = erlaubt.find((e) => e.regel === gruppe.id);
				expect(
					eintrag,
					`Neue unentscheidbare axe-Regel auf ${route.pfad}: ${gruppe.id} (${gruppe.nodes.length} Knoten)\n` +
						`${gruppe.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n')}\n` +
						'Die Knoten ansehen und entscheiden: entweder an der Aufrufstelle beheben ' +
						'(dann verschwindet der Eintrag) oder mit Begründung in UNENTSCHIEDEN aufnehmen.'
				).toBeDefined();
				expect(
					gruppe.nodes.length,
					`${route.pfad}: ${gruppe.id} hat ${gruppe.nodes.length} unentscheidbare Knoten, erlaubt sind ${eintrag?.hoechstens}. ` +
						`Grund des Eintrags: ${eintrag?.grund} — die neuen Knoten ansehen, bevor die Zahl steigt.\n` +
						`${gruppe.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n')}`
				).toBeLessThanOrEqual(eintrag?.hoechstens ?? 0);
			}

			/* Gegenrichtung: Ein Eintrag, dessen Gruppe verschwunden ist, muss
			   auffallen. Sonst bleibt er als toter Deckel stehen — und deckt eine
			   spätere Regression, die genau wieder unter seine Zahl passt, still
			   ab. Eine Ausnahmeliste, die nur wächst, ist keine. */
			const gemeldet = new Set(ergebnis.incomplete.map((g) => g.id));
			for (const eintrag of erlaubt) {
				expect(
					gemeldet.has(eintrag.regel),
					`Veralteter UNENTSCHIEDEN-Eintrag auf ${route.pfad}: ${eintrag.regel} meldet nichts mehr. ` +
						`Begründung war: ${eintrag.grund} — Eintrag entfernen, sonst deckt er später wieder auftauchende Knoten stillschweigend ab.`
				).toBe(true);
			}
		});
	}
});
