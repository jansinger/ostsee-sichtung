/**
 * @fileoverview Guard gegen unbelegte Zahlenangaben in Nutzertexten
 *
 * Hintergrund: Im Sichtungsformular standen über längere Zeit erfundene
 * Statistiken in den `valueText`-Tooltips ("73% der Schweinswalsichtungen
 * erfolgen morgens", "2.847 andere Sichtungen", "47 neue Verhaltensweisen").
 * Die Plattform wird vom Deutschen Meeresmuseum betrieben — erfundene Zahlen
 * gegenüber Bürger:innen sind ein Glaubwürdigkeitsrisiko.
 *
 * Regel: Zahlen in Motivationstexten (`valueText`) nur mit Quelle. Jede
 * Zahlenangabe muss bewusst in `REVIEWED_NUMERIC_TEXTS` eingetragen und dort
 * mit ihrer Herkunft begründet werden. Wer eine neue Zahl einbaut, wird von
 * diesem Test gezwungen, die Quelle zu dokumentieren.
 *
 * Siehe `.claude/rules/design-system.md` → "Zahlen in Nutzertexten".
 */

import { describe, expect, it } from 'vitest';
import { sightingSchema } from './sightingSchema';

interface FieldMeta {
	valueText?: string;
	helpText?: string;
}

/**
 * Zahlenangaben, die geprüft und belegt sind.
 *
 * Jeder Eintrag braucht eine Begründung: entweder eine nachrechenbare
 * technische Größe oder eine benannte Quelle. Reine Marketing-Zahlen
 * gehören NICHT hierher, sondern aus dem Text heraus.
 */
const REVIEWED_NUMERIC_TEXTS: ReadonlyArray<{ text: string; quelle: string }> = [
	{
		text: 'GPS-Präzision: 6 Nachkommastellen = 11cm Genauigkeit',
		quelle:
			'Nachrechenbar: 1e-6° Breite ≈ 0,11 m (Erdumfang über die Pole / 360 / 1e6). Keine empirische Behauptung.'
	},
	{
		text: 'Schiffsnamen ermöglichen Langzeitauswertungen - einzelne Schiffe melden laut unserer Sichtungsdatenbank seit über 20 Jahren immer wieder Sichtungen',
		quelle:
			'Eigene Sichtungsdatenbank, Abfrage vom 2026-07-27: Gruppierung nach schiffsname (>5 Meldungen, sichtungsdatum > 1990 wegen 1970-Platzhaltern) ergibt u.a. "PENNY LANE" 95 Meldungen über 22,8 Jahre (2002-2025) und "SY Julka" 36 Meldungen über 21,2 Jahre. Die Aussage "über 20 Jahre" ist damit belegt und konservativ.'
	}
];

/**
 * Muster für quantitative Behauptungen, die ohne Quelle nicht in
 * Nutzertexte gehören (Prozentwerte, Vielfache, Zeiträume, Stückzahlen).
 */
const QUANTITATIVE_CLAIM_PATTERNS: ReadonlyArray<RegExp> = [
	/\d+\s*%/, // "40% höhere Wahrscheinlichkeit"
	/\d+\s*(?:x|-?fach)\b/i, // "3x höhere Entdeckungsrate"
	/\bseit\s+\d+\s+Jahren\b/i, // "seit 15 Jahren"
	/\b\d[\d.,]*\s+(?:neue|neuen|andere|anderen|weitere)\b/i // "47 neue Verhaltensweisen"
];

/**
 * Aussagen, die fremde Institutionen vereinnahmen oder den Meldenden eine
 * Verwertung zusichern, die die Plattform nicht garantieren kann.
 *
 * Anlass: In `envReport` stand "Ihre Umweltbeobachtungen werden für den
 * IPCC-Meeresspiegel-Report verwendet" — der IPCC verarbeitet keine
 * Sichtungsmeldungen von Bürger:innen, und einen solchen Report gibt es nicht.
 * Namen echter Institutionen sind besonders heikel: sie sind für Nutzer:innen
 * nicht überprüfbar und beschädigen im Zweifel deren Ruf mit.
 */
const INSTITUTIONAL_CLAIM_PATTERNS: ReadonlyArray<RegExp> = [
	/\bIPCC\b/i,
	/\bUNESCO\b/i,
	/\bHELCOM\b/i,
	/\bASCOBANS\b/i,
	/werden\s+(?:in|für)\s+.*\b(?:publiziert|veröffentlicht|verwendet)\b/i
];

/** Zitierte Feldwerte wie "0 Schiffe" sind Bedienhinweise, keine Statistik. */
const stripQuotedValues = (text: string): string =>
	text.replace(/["„»][^"“«]*["“«]/g, ' ').replace(/'[^']*'/g, ' ');

function collectMeta(): Array<{ field: string; key: keyof FieldMeta; text: string }> {
	const described = sightingSchema.describe() as unknown as {
		fields: Record<string, { meta?: FieldMeta }>;
	};

	const collected: Array<{ field: string; key: keyof FieldMeta; text: string }> = [];
	for (const [field, definition] of Object.entries(described.fields)) {
		const meta = definition?.meta;
		if (!meta) continue;
		for (const key of ['valueText', 'helpText'] as const) {
			const text = meta[key];
			if (typeof text === 'string' && text.length > 0) {
				collected.push({ field, key, text });
			}
		}
	}
	return collected;
}

const isReviewed = (text: string): boolean =>
	REVIEWED_NUMERIC_TEXTS.some((entry) => entry.text === text);

describe('sightingSchema — Zahlenangaben in Nutzertexten', () => {
	it('findet überhaupt Metadaten zum Prüfen', () => {
		expect(collectMeta().length).toBeGreaterThan(20);
	});

	it('enthält in valueText keine unbelegten Zahlen', () => {
		const offenders = collectMeta()
			.filter(({ key }) => key === 'valueText')
			.filter(({ text }) => /\d/.test(stripQuotedValues(text)))
			.filter(({ text }) => !isReviewed(text))
			.map(({ field, text }) => `${field}: "${text}"`);

		expect(
			offenders,
			`Unbelegte Zahlen in valueText gefunden.\n` +
				`Entweder Quelle ergänzen und in REVIEWED_NUMERIC_TEXTS eintragen,\n` +
				`oder die Zahl durch eine nachprüfbare Aussage ersetzen:\n` +
				offenders.join('\n')
		).toEqual([]);
	});

	it('enthält in helpText keine unbelegten quantitativen Behauptungen', () => {
		const offenders = collectMeta()
			.filter(({ key }) => key === 'helpText')
			.filter(({ text }) => QUANTITATIVE_CLAIM_PATTERNS.some((pattern) => pattern.test(text)))
			.filter(({ text }) => !isReviewed(text))
			.map(({ field, text }) => `${field}: "${text}"`);

		expect(
			offenders,
			`Unbelegte quantitative Behauptung in helpText gefunden:\n` + offenders.join('\n')
		).toEqual([]);
	});

	it('vereinnahmt keine fremden Institutionen und verspricht keine Verwertung', () => {
		const offenders = collectMeta()
			.filter(({ text }) => INSTITUTIONAL_CLAIM_PATTERNS.some((pattern) => pattern.test(text)))
			.map(({ field, key, text }) => `${field}.${key}: "${text}"`);

		expect(
			offenders,
			`Nicht belegbare Institutions- oder Verwertungszusage gefunden.\n` +
				`Nur nennen, was die Plattform tatsächlich zusichern kann:\n` +
				offenders.join('\n')
		).toEqual([]);
	});

	it('nennt für jede freigegebene Zahlenangabe eine Quelle', () => {
		for (const entry of REVIEWED_NUMERIC_TEXTS) {
			expect(entry.quelle.trim().length, `Quelle fehlt für: "${entry.text}"`).toBeGreaterThan(20);
		}
	});
});
