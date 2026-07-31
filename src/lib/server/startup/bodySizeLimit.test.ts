import { describe, expect, it } from 'vitest';
import { warnIfBodySizeLimitTooLow } from './bodySizeLimit';

const MB = 1024 * 1024;

describe('warnIfBodySizeLimitTooLow', () => {
	it('warnt, wenn die Plattformgrenze unter dem App-Limit liegt', () => {
		const warning = warnIfBodySizeLimitTooLow(String(50 * MB), 100 * MB);

		expect(warning).not.toBeNull();
		expect(warning).toContain('BODY_SIZE_LIMIT');
	});

	it('warnt auch bei Gleichstand — der Multipart-Rahmen braucht Luft', () => {
		expect(warnIfBodySizeLimitTooLow(String(100 * MB), 100 * MB)).not.toBeNull();
	});

	it('schweigt, wenn die Plattformgrenze ausreichend darüber liegt', () => {
		expect(warnIfBodySizeLimitTooLow(String(120 * MB), 100 * MB)).toBeNull();
	});

	it('schweigt bei "Infinity"', () => {
		expect(warnIfBodySizeLimitTooLow('Infinity', 100 * MB)).toBeNull();
	});

	it('warnt, wenn die Variable nicht gesetzt ist — der Adapter greift dann auf seinen Standardwert 512K zurück', () => {
		// node_modules/@sveltejs/adapter-node/files/handler.js:25 —
		// `parse_as_bytes(env('BODY_SIZE_LIMIT', '512K'))`. Ungesetzt heißt also
		// NICHT "keine Grenze", sondern rund ein Zweihundertstel der 100-MB-Videogrenze
		// — der gefährlichste der beiden Fälle, den die alte Implementierung als
		// "in Ordnung" behandelte.
		const warning = warnIfBodySizeLimitTooLow(undefined, 100 * MB);

		expect(warning).not.toBeNull();
		// Der Text muss den tatsächlich wirksamen Wert nennen, nicht "nicht gesetzt".
		expect(warning).toMatch(/512\s*KB/i);
	});

	it('erkennt den Einheiten-Suffix "M" wie der Adapter — 100M ist zu wenig für 100 MB plus Multipart-Zuschlag', () => {
		// node_modules/@sveltejs/adapter-node/files/utils.js:9-17 — parse_as_bytes
		// unterstützt K/M/G. `Number('100M')` selbst ist NaN; die alte Implementierung
		// schwieg deshalb bei jedem Suffix-Wert, obwohl 100M unter der nötigen Grenze liegt.
		expect(warnIfBodySizeLimitTooLow('100M', 100 * MB)).not.toBeNull();
	});

	it('rechnet den Suffix "G" korrekt um und schweigt, weil 2G weit über dem App-Limit liegt', () => {
		expect(warnIfBodySizeLimitTooLow('2G', 100 * MB)).toBeNull();
	});

	it('schweigt bei einem wirklich ausreichenden Suffix-Wert', () => {
		expect(warnIfBodySizeLimitTooLow('150M', 100 * MB)).toBeNull();
	});

	it('erkennt Suffixe case-insensitiv wie der Adapter', () => {
		expect(warnIfBodySizeLimitTooLow('2g', 100 * MB)).toBeNull();
		expect(warnIfBodySizeLimitTooLow('50m', 100 * MB)).not.toBeNull();
	});
});
