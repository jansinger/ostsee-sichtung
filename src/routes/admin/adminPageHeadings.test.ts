/**
 * @fileoverview Jede Admin-Seite beginnt ihre Überschriftenstruktur bei `<h1>`.
 *
 * **Der Befund.** Detailansicht und Bearbeitungsseite starteten bei `<h2>`, und
 * das Root-Layout liefert keine Überschrift — die Struktur begann dort also auf
 * Ebene 2. Wer per Screenreader über Überschriften navigiert (in JAWS/NVDA die
 * Taste `1`), landet auf diesen beiden Seiten nirgends: Es gibt keine Ebene 1,
 * zu der gesprungen werden könnte. WCAG 1.3.1.
 *
 * **Warum als Quelltext-Scan und nicht im DOM.** Die beiden Routen brauchen
 * einen Server-Load mit Datenbank; ein DOM-Test dafür hinge an einem Seed und
 * liefe nur in der E2E-Suite. Die Aussage „diese Datei bringt eine h1 mit" ist
 * dagegen statisch entscheidbar und läuft in `test:quick` mit. Vorbild:
 * `editPageHeading.test.ts` nebenan und `verifiedReadScan.test.ts`.
 *
 * **`/admin/docs` steht bewusst mit einer anderen Erwartung hier.** Die Seite
 * hat in ihrer eigenen Datei keine Überschrift und sah beim Zählen per `grep`
 * deshalb aus wie ein dritter Fall — sie delegiert ihre `h1` aber an
 * `ApiDocumentation.svelte`. Der Fall ist mit aufgenommen, damit dieser
 * Irrtum nicht erneut entsteht und damit das Verschieben der Überschrift aus
 * der Komponente heraus hier auffällt.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lies = (pfad: string) => readFileSync(new URL(pfad, import.meta.url), 'utf-8');

/** Seiten, die ihre `h1` selbst mitbringen. */
const SEITEN_MIT_EIGENER_H1 = [
	{ name: 'Eingang', pfad: './+page.svelte' },
	{ name: 'Sichtungstabelle', pfad: './sichtungen/+page.svelte' },
	{ name: 'Detailansicht', pfad: './[id]/+page.svelte' },
	{ name: 'Bearbeiten', pfad: './[id]/edit/+page.svelte' },
	{ name: 'Statistik', pfad: './statistics/+page.svelte' },
	{ name: 'Einstellungen', pfad: './settings/+page.svelte' },
	{ name: 'Referenz-Lookup', pfad: './ref/[refId]/+page.svelte' }
] as const;

describe('Admin-Seiten — Überschriftenstruktur beginnt bei h1', () => {
	for (const { name, pfad } of SEITEN_MIT_EIGENER_H1) {
		it(`${name} bringt eine h1 mit`, () => {
			expect(lies(pfad)).toMatch(/<h1[\s>]/);
		});
	}

	/*
	 * Die Sichtungstabelle rendert zwei Kopfzeilen (Mobil und Desktop) und
	 * damit zwei `<h1>` im Quelltext. Das ist kein Verstoß: Sie hängen an
	 * `hidden`/`sm:hidden`, also an `display: none` — im Accessibility-Tree
	 * steht immer genau eine. Der Fall ist hier notiert, weil ein Zählen von
	 * `<h1`-Vorkommen sonst als „Duplikat" durchginge und jemand die falsche
	 * der beiden entfernte.
	 */
	it('die zwei h1 der Tabelle sind Layout-Varianten, keine Dopplung', () => {
		const quelle = lies('./sichtungen/+page.svelte');
		expect(quelle.match(/<h1[\s>]/g)).toHaveLength(2);
		expect(quelle).toContain('block space-y-3 sm:hidden');
		expect(quelle).toContain('hidden items-center justify-between sm:flex');
	});

	it('die Dokumentation bezieht ihre h1 aus ApiDocumentation', () => {
		expect(lies('./docs/+page.svelte')).not.toMatch(/<h1[\s>]/);
		expect(lies('../../lib/components/docs/ApiDocumentation.svelte')).toMatch(/<h1[^>]*>\{title\}/);
	});
});
