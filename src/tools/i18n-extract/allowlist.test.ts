import { describe, expect, it } from 'vitest';
import {
	checkValue,
	messageArgumentIndex,
	metaKeyDecision,
	NON_TRANSLATABLE_META_KEYS,
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

	it('führt die beiden Listen überschneidungsfrei', () => {
		const overlap = TRANSLATABLE_META_KEYS.filter((k) =>
			(NON_TRANSLATABLE_META_KEYS as readonly string[]).includes(k)
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
