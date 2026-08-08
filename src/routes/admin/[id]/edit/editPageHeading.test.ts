/**
 * @fileoverview Die Bearbeitungsseite nannte sich „Sichtung Details" — derselbe
 * Wortlaut wie die Detailansicht und derselbe `<title>`-Aufbau. Wer zwei Tabs
 * offen hatte, konnte Lesen und Bearbeiten nicht auseinanderhalten.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const quelle = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf-8');

describe('Bearbeitungsseite — Überschrift und Seitentitel', () => {
	it('überschreibt die Seite mit „Sichtung bearbeiten"', () => {
		expect(quelle).toContain('<h2 class="text-xl font-bold">Sichtung bearbeiten</h2>');
	});

	it('nennt die Bearbeitung nicht „Details"', () => {
		expect(quelle).not.toContain('Sichtung Details');
	});

	it('trägt denselben Wortlaut im Seitentitel wie in der Überschrift', () => {
		// Der Tab-Titel ist im Alltag die einzige Unterscheidung zwischen zwei
		// offenen Tabs derselben Sichtung — er muss dieselbe Vokabel führen.
		const titel = quelle.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
		expect(titel).toBe('Sichtung #{data.sighting?.id} bearbeiten - Admin - Ostsee-Tiere');
	});
});
