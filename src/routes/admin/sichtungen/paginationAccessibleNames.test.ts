/**
 * @fileoverview Die Seiten-Navigation braucht zugängliche Namen, nicht nur
 * Tooltips.
 *
 * **Der Befund (Review zu PR #811).** Die vier Schaltflächen tragen als
 * Beschriftung nur ein Zeichen — `«`, `‹`, `›`, `»` — und daneben ein `title`.
 * Nach den Accessible-Name-Regeln gewinnt der **Inhalt** eines Buttons gegen
 * sein `title`: Der zugängliche Name war damit „«", und Screenreader lesen
 * daraus je nach Stimme „doppeltes spitzes Anführungszeichen links" oder gar
 * nichts. Der `title` erreicht ohnehin nur das Zeigegerät.
 *
 * Das `title` bleibt trotzdem stehen: Es trägt den Maus-Tooltip, und
 * `e2e/design-tokens.spec.ts` selektiert seine `renders`-Sonde für
 * `/admin/sichtungen` über `.join button[title="Nächste Seite"]`.
 *
 * **Warum als Quelltext-Scan.** Die Seite braucht einen Server-Load mit
 * Datenbank; ein DOM-Test dafür liefe nur in der E2E-Suite. Vorbild:
 * `editPageHeading.test.ts` und `adminPageHeadings.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const quelle = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf-8');

/**
 * Der Block der Seiten-Navigation — nur er ist hier gemeint.
 *
 * HTML-Kommentare fliegen vorher raus: Die Begründung an der Seitenanzeige
 * zitiert das Wort `<button>`, und ein Zählen über den Rohtext fand deshalb
 * fünf statt vier Schaltflächen. Ein Kommentar ist kein Markup — er wird von
 * Svelte nicht einmal ausgeliefert.
 */
const ohneKommentare = quelle.replace(/<!--[\s\S]*?-->/g, '');
const navigation = ohneKommentare.slice(
	ohneKommentare.indexOf('<nav class="join" aria-label="Seiten-Navigation">'),
	ohneKommentare.indexOf('</nav>')
);

describe('Seiten-Navigation — zugängliche Namen', () => {
	it('findet den Navigationsblock', () => {
		expect(navigation).not.toBe('');
		expect(navigation).toContain('Erste Seite');
	});

	/* Jede Schaltfläche einzeln: Ein `every` über alle wäre bei einem Fehlschlag
	   die Aussage „irgendeine von vier" und hilft beim Beheben nicht.

	   Geschnitten wird am schließenden Tag und NICHT am ersten `>`: Die
	   `onclick`-Handler enthalten mit `() =>` selbst ein Größerzeichen, ein
	   Schnitt dort endete mitten im Attributblock und fand das `aria-label`
	   nie — der erste Anlauf dieses Tests ist genau daran gescheitert. */
	const schaltflaechen = navigation
		.split('<button')
		.slice(1)
		.map((block) => block.slice(0, block.indexOf('</button>')));

	it('enthält genau die vier Schaltflächen', () => {
		expect(schaltflaechen).toHaveLength(4);
	});

	it.each([0, 1, 2, 3])('Schaltfläche %i trägt ein aria-label', (index) => {
		expect(schaltflaechen[index]).toMatch(/aria-label="[^"]+"/);
	});

	/* Das Zeichen allein darf nicht als Name durchgehen — genau das war der
	   Zustand vorher. */
	it.each([0, 1, 2, 3])('das aria-label von Schaltfläche %i ist keine Zierglyphe', (index) => {
		const name = schaltflaechen[index]?.match(/aria-label="([^"]+)"/)?.[1] ?? '';
		expect(name).toMatch(/Seite/);
	});

	it('behält den title für den Maus-Tooltip und die E2E-Sonde', () => {
		expect(navigation).toContain('title="Nächste Seite"');
	});
});
