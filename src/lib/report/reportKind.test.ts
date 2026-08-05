import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '$lib/storage/localStorage';
import {
	clearReportKind,
	readReportKind,
	resolveReportKind,
	reportKindToIsDead,
	writeReportKind
} from './reportKind';

// Mock localStorage für Node.js Tests — REPORT_KIND liegt nicht in sessionKeys,
// landet also immer in localStorage (siehe localStorage.ts).
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		length: Object.keys(store).length,
		key: (index: number) => Object.keys(store)[index] || null
	};
})();

vi.mock('$app/environment', () => ({
	browser: true
}));

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'window', { value: global });

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

	it('ignoriert geerbte Property-Namen im Parameter-Lookup (Prototype-Lücke)', () => {
		// Der Query-Parameter kommt fremdkontrolliert aus der URL. Ein normales
		// Objektliteral als Lookup-Tabelle liefert für geerbte Property-Namen
		// truthy Werte statt undefined — resolveReportKind('constructor', ...)
		// gäbe sonst die Function Object zurück statt null.
		expect(resolveReportKind('constructor', null, null)).toBeNull();
		expect(resolveReportKind('__proto__', null, null)).toBeNull();
		expect(resolveReportKind('toString', null, null)).toBeNull();
		expect(resolveReportKind('valueOf', null, null)).toBeNull();
		expect(resolveReportKind('hasOwnProperty', null, null)).toBeNull();
	});
});

describe('reportKindToIsDead', () => {
	it('bildet die zwei Zweige auf isDead ab', () => {
		expect(reportKindToIsDead('alive')).toBe(false);
		expect(reportKindToIsDead('dead')).toBe(true);
	});
});

describe('reportKind storage roundtrip', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('clearReportKind entfernt den Schlüssel statt "null" zu speichern', () => {
		writeReportKind('dead');
		expect(localStorage.getItem(STORAGE_KEYS.REPORT_KIND)).not.toBeNull();

		clearReportKind();

		// saveToStorage(key, null) würde den String "null" ablegen — der Schlüssel
		// muss stattdessen vollständig verschwinden, wie bei clearUserContactData.
		expect(localStorage.getItem(STORAGE_KEYS.REPORT_KIND)).toBeNull();
		expect(readReportKind()).toBeNull();
	});
});
