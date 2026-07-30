import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { describe, expect, it } from 'vitest';
import { getDefaultConfigurationsByCategory } from '$lib/server/services/configInitializer';
import { EMAIL_COLORS, emailColorContext } from './emailTokens';

/**
 * Der Guard für die E-Mail-Seite des Design Systems.
 *
 * Warum kein DOM-Scan wie bei `e2e/design-tokens.spec.ts`: E-Mail-HTML wird nie
 * in einem Browser dieses Projekts gerendert. Die Prüfung muss deshalb über die
 * Vorlagen-Quelltexte laufen — über **beide** ausgelieferten Vorlagen: die Datei
 * `sightingNotificationTemplate.html` (Code-Default) und den Seed, der nach
 * `app_config` geschrieben wird.
 *
 * Der Seed wurde bei der Einführung dieses Tests übersehen, weil er als
 * Template-Literal mitten in `configInitializer.ts` stand. Seit dem 2026-07-30
 * liegt er in `notificationEmailDefault.ts`, wird hier aber weiterhin über
 * `getDefaultConfigurationsByCategory()` gelesen — also über den Weg, auf dem er
 * tatsächlich in der Datenbank landet. Ein direkter Import der Konstante würde
 * nicht bemerken, wenn der Seed-Eintrag versehentlich auf etwas anderes zeigt.
 */

const templateDir = dirname(fileURLToPath(import.meta.url));

const fileTemplate = readFileSync(join(templateDir, 'sightingNotificationTemplate.html'), 'utf-8');

const dbDefaultTemplate = String(
	getDefaultConfigurationsByCategory()['email']?.find(
		(item) => item.key === 'notification.email.template'
	)?.value ?? ''
);

const TEMPLATES = [
	['sightingNotificationTemplate.html', fileTemplate],
	['configInitializer: notification.email.template', dbDefaultTemplate]
] as const;

describe('E-Mail-Vorlagen — Farben kommen aus emailTokens', () => {
	for (const [name, template] of TEMPLATES) {
		it(`${name}: keine hartcodierten Hex-Werte`, () => {
			const offenders = template.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
			expect(offenders, 'Farbe gehört nach emailTokens.ts, im Template {{colors.…}}').toEqual([]);
		});

		/* Verläufe widersprechen `--depth: 1` / `--noise: 0`: die App zeichnet
		   Flächen einfarbig. Zwei Verläufe im Kopfbereich und auf dem Button
		   waren der einzige Ort, an dem das nicht galt. */
		it(`${name}: keine Verlaufsflächen`, () => {
			expect(template).not.toContain('linear-gradient');
			expect(template).not.toContain('radial-gradient');
		});

		it(`${name}: benutzt nur Farbnamen, die es in EMAIL_COLORS gibt`, () => {
			const used = [...template.matchAll(/\{\{colors\.([a-zA-Z]+)\}\}/g)].map(
				(match) => match[1] ?? ''
			);
			expect(used.length, 'Vorlage referenziert überhaupt Theme-Farben').toBeGreaterThan(0);

			const unknown = [...new Set(used)].filter((name) => !(name in EMAIL_COLORS));
			expect(unknown, 'unbekannter Farbname — Tippfehler rendert als leerer String').toEqual([]);
		});

		it(`${name}: rendert mit emailColorContext() ohne offene Platzhalter`, () => {
			const html = Handlebars.compile(template)(emailColorContext());
			expect(html).not.toContain('{{colors.');
			expect(html).toContain(EMAIL_COLORS.brand);
		});

		/**
		 * Der Ostsee-Status gehört nicht in die Vorlage nachgebaut.
		 *
		 * `ostsee_geo` ist die grobe Bounding Box; wer darüber verzweigt, weist
		 * eine Meldung aus dem Hamburger Hafen als Ostsee-Sichtung aus. Genau das
		 * ist beiden Vorlagen passiert (Fehler 4 in `docs/OSTSEE_FLAGS.md`) — der
		 * Status kommt seit dem 2026-07-30 vorberechnet als `sighting.balticSea`
		 * aus `balticSeaEmailContext.ts`.
		 *
		 * Die Prüfung sitzt bewusst in dieser Schleife und nicht in
		 * `notificationEmailDefault.test.ts`: dort deckte sie nur den Seed ab,
		 * während die Datei-Vorlage — die ausgeliefert wird, solange `app_config`
		 * den Schlüssel nicht hat — unbewacht blieb. Ein Guard, der nur eine von
		 * zwei Kopien kennt, ist der Fehler eine Ebene höher.
		 */
		it(`${name}: verzweigt nicht über die Ostsee-Rohflags`, () => {
			const rawFlagBlocks = [...template.matchAll(/\{\{#(?:if|unless)\s+sighting\.(\w+)/g)]
				.map((match) => match[1] ?? '')
				.filter((field) => field === 'inBalticSea' || field === 'inBalticSeaGeo');

			expect(
				rawFlagBlocks,
				'Status über {{sighting.balticSea.…}} beziehen, nicht über die Rohflags'
			).toEqual([]);
		});
	}
});
