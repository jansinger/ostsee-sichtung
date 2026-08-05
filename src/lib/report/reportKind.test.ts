import { describe, expect, it } from 'vitest';
import { resolveReportKind, reportKindToIsDead } from './reportKind';

describe('resolveReportKind', () => {
	it('liefert null, wenn nichts bekannt ist — die Auswahlseite muss erscheinen', () => {
		expect(resolveReportKind(null, null, null)).toBeNull();
	});

	it('nimmt den gespeicherten Zweig, wenn kein Parameter gesetzt ist', () => {
		expect(resolveReportKind(null, 'dead', null)).toBe('dead');
	});

	it('leitet den Zweig aus gespeichertem isDead ab, wenn reportKind fehlt (Migration)', () => {
		// Beim Deploy sitzen Nutzer mitten im Formular. Ohne diese Ableitung
		// würden sie auf die Auswahlseite zurückgeworfen.
		expect(resolveReportKind(null, null, false)).toBe('alive');
		expect(resolveReportKind(null, null, true)).toBe('dead');
	});

	it('lässt den Query-Parameter gegen den gespeicherten Zweig gewinnen', () => {
		expect(resolveReportKind('totfund', 'alive', null)).toBe('dead');
		expect(resolveReportKind('lebend', 'dead', null)).toBe('alive');
	});

	it('ignoriert einen unbekannten Parameterwert', () => {
		expect(resolveReportKind('bloedsinn', 'alive', null)).toBe('alive');
		expect(resolveReportKind('bloedsinn', null, null)).toBeNull();
	});
});

describe('reportKindToIsDead', () => {
	it('bildet die zwei Zweige auf isDead ab', () => {
		expect(reportKindToIsDead('alive')).toBe(false);
		expect(reportKindToIsDead('dead')).toBe(true);
	});
});
