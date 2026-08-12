import { describe, expect, it } from 'vitest';
import {
	checkValue,
	isKnownNoMessageMethod,
	messageArgumentIndex,
	metaKeyDecision,
	TRANSLATABLE_META_KEYS
} from './allowlist';

describe('metaKeyDecision', () => {
	it('extrahiert die drei sprachlichen meta-Schlüssel', () => {
		expect(metaKeyDecision('helpText')).toEqual({ kind: 'extract' });
		expect(metaKeyDecision('placeholder')).toEqual({ kind: 'extract' });
		expect(metaKeyDecision('valueText')).toEqual({ kind: 'extract' });
	});

	it('überspringt meta.type — FieldRenderer schaltet daran den Feldtyp um', () => {
		expect(metaKeyDecision('type')).toEqual({
			kind: 'skip',
			reason: 'meta-key-denied',
			explanation: 'meta.type steuert den FieldRenderer, kein Anzeigetext'
		});
	});

	it('überspringt icon, options, autocomplete und step', () => {
		for (const key of ['icon', 'options', 'autocomplete', 'step']) {
			expect(metaKeyDecision(key).kind).toBe('skip');
		}
	});

	// Die Asymmetrie zu messageArgumentIndex ist Absicht: Ein unbekannter
	// meta-Schlüssel kann sprachlich sein und würde sonst still deutsch bleiben.
	it('bricht bei einem unbekannten meta-Schlüssel ab, statt zu raten', () => {
		expect(metaKeyDecision('tooltipText')).toEqual({
			kind: 'unknown',
			reason: 'meta-key-unknown',
			explanation:
				'meta.tooltipText steht weder in TRANSLATABLE_META_KEYS noch in NON_TRANSLATABLE_META_KEYS'
		});
	});

	// Befund F: NON_TRANSLATABLE_META_KEYS wurde entfernt (toter Export, siehe
	// allowlist.ts) — die Überschneidungsfreiheit wird jetzt über das
	// beobachtbare Verhalten geprüft: Kein sprachlicher Schlüssel darf als
	// 'skip' entschieden werden, kein verweigerter Schlüssel als 'extract'.
	it('führt die beiden Listen überschneidungsfrei', () => {
		const deniedKeys = ['type', 'icon', 'options', 'autocomplete', 'step'];
		for (const key of TRANSLATABLE_META_KEYS) {
			expect(metaKeyDecision(key).kind, `${key} sollte extrahiert werden`).toBe('extract');
		}
		for (const key of deniedKeys) {
			expect(metaKeyDecision(key).kind, `${key} sollte verweigert werden`).toBe('skip');
		}
		const overlap = TRANSLATABLE_META_KEYS.filter((k) =>
			(deniedKeys as readonly string[]).includes(k)
		);
		expect(overlap).toEqual([]);
	});
});

describe('messageArgumentIndex', () => {
	it('kennt die Argumentposition der Meldung je Yup-Regel', () => {
		expect(messageArgumentIndex('required')).toBe(0);
		expect(messageArgumentIndex('email')).toBe(0);
		expect(messageArgumentIndex('min')).toBe(1);
		expect(messageArgumentIndex('max')).toBe(1);
		expect(messageArgumentIndex('matches')).toBe(1);
		expect(messageArgumentIndex('oneOf')).toBe(1);
	});

	// Der teuerste Einzelfall: Argument 0 ist der Testname und wird
	// maschinell ausgewertet (errors[field].type).
	it('nennt für test() die Position 1, nicht 0', () => {
		expect(messageArgumentIndex('test')).toBe(1);
	});

	it('liefert undefined für Regeln ohne Meldung', () => {
		expect(messageArgumentIndex('default')).toBeUndefined();
		expect(messageArgumentIndex('when')).toBeUndefined();
		expect(messageArgumentIndex('shape')).toBeUndefined();
		expect(messageArgumentIndex('transform')).toBeUndefined();
	});

	// Befund (Aufgabe 4): .integer(message) an vier Feldern (totalCount,
	// juvenileCount, deadSize, shipCount) verschwand bisher spurlos — weder Fund
	// noch Übersprungen. NumberSchema.integer(message?: Message<any>): this,
	// node_modules/yup/index.d.ts:706 — die Meldung ist das einzige Argument.
	it('nennt für integer die Position 0', () => {
		expect(messageArgumentIndex('integer')).toBe(0);
	});

	// Weitere meldungstragende Yup-Methoden, an node_modules/yup/index.d.ts
	// belegt, nicht geraten.
	it('kennt die Argumentposition weiterer meldungstragender Yup-Regeln', () => {
		expect(messageArgumentIndex('positive')).toBe(0);
		expect(messageArgumentIndex('negative')).toBe(0);
		expect(messageArgumentIndex('trim')).toBe(0);
		expect(messageArgumentIndex('lowercase')).toBe(0);
		expect(messageArgumentIndex('uppercase')).toBe(0);
		expect(messageArgumentIndex('uuid')).toBe(0);
		expect(messageArgumentIndex('defined')).toBe(0);
		expect(messageArgumentIndex('nonNullable')).toBe(0);
		// lessThan/moreThan tragen wie min/max zuerst den Vergleichswert.
		expect(messageArgumentIndex('lessThan')).toBe(1);
		expect(messageArgumentIndex('moreThan')).toBe(1);
	});
});

describe('isKnownNoMessageMethod', () => {
	it('kennt die im Bestand aufgerufenen meldungsfreien Yup-Methoden', () => {
		for (const method of [
			'array',
			'boolean',
			'number',
			'object',
			'string',
			'mixed',
			'of',
			'shape',
			'concat',
			'default',
			'transform',
			'when',
			'nullable',
			'notRequired',
			'optional'
		]) {
			expect(isKnownNoMessageMethod(method), method).toBe(true);
		}
	});

	it('hält eine erfundene Methode für nicht bekannt', () => {
		expect(isKnownNoMessageMethod('someFutureRule')).toBe(false);
	});

	// Die Asymmetrie ist Absicht (siehe Dateikopf allowlist.ts): Eine
	// meldungstragende Regel darf nicht zusätzlich als meldungsfrei gelten,
	// sonst würde sie in collect.ts nie als `method-unknown` gemeldet.
	it('führt MESSAGE_ARGUMENT_INDEX und NO_MESSAGE_METHOD_REASONS überschneidungsfrei', () => {
		const messageMethods = [
			'required',
			'email',
			'url',
			'typeError',
			'integer',
			'positive',
			'negative',
			'trim',
			'lowercase',
			'uppercase',
			'uuid',
			'defined',
			'nonNullable',
			'min',
			'max',
			'length',
			'matches',
			'oneOf',
			'notOneOf',
			'lessThan',
			'moreThan',
			'test'
		];
		for (const method of messageMethods) {
			expect(isKnownNoMessageMethod(method), method).toBe(false);
			expect(messageArgumentIndex(method), method).not.toBeUndefined();
		}
	});
});

describe('checkValue', () => {
	it('nimmt gewöhnlichen Anzeigetext an', () => {
		expect(checkValue('Bitte wählen Sie eine Tierart aus')).toEqual({ ok: true });
	});

	it('überspringt rein numerische Zeichenketten', () => {
		expect(checkValue('1').ok).toBe(false);
		expect(checkValue('12345')).toEqual({
			ok: false,
			reason: 'numeric-only',
			explanation: 'rein numerisch — in jeder Sprache derselbe Text'
		});
	});

	it('überspringt leere Zeichenketten', () => {
		// sightingSchema.ts:1403 trägt message: '' — das überschreibt nur einen
		// gleichnamigen Test, es ist keine Botschaft.
		expect(checkValue('')).toEqual({
			ok: false,
			reason: 'empty-string',
			explanation: 'leere Zeichenkette ist keine Botschaft'
		});
		expect(checkValue('   ').ok).toBe(false);
	});
});
