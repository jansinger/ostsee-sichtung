import { describe, expect, it } from 'vitest';
import { parseRangeHeader } from './rangeHeader';

const SIZE = 1000;

describe('parseRangeHeader', () => {
	it('meldet "kein Range", wenn der Header fehlt', () => {
		expect(parseRangeHeader(null, SIZE)).toEqual({ kind: 'none' });
	});

	it('liest einen vollständigen Bereich', () => {
		expect(parseRangeHeader('bytes=0-499', SIZE)).toEqual({
			kind: 'satisfiable',
			start: 0,
			end: 499
		});
	});

	it('ergänzt ein fehlendes Ende bis zum Dateiende', () => {
		expect(parseRangeHeader('bytes=500-', SIZE)).toEqual({
			kind: 'satisfiable',
			start: 500,
			end: 999
		});
	});

	it('liest ein Suffix vom Dateiende her', () => {
		expect(parseRangeHeader('bytes=-200', SIZE)).toEqual({
			kind: 'satisfiable',
			start: 800,
			end: 999
		});
	});

	it('kappt ein Ende jenseits der Datei', () => {
		expect(parseRangeHeader('bytes=900-5000', SIZE)).toEqual({
			kind: 'satisfiable',
			start: 900,
			end: 999
		});
	});

	it('kappt ein Suffix, das größer als die Datei ist', () => {
		expect(parseRangeHeader('bytes=-5000', SIZE)).toEqual({
			kind: 'satisfiable',
			start: 0,
			end: 999
		});
	});

	it('meldet einen Start jenseits der Datei als nicht erfüllbar', () => {
		expect(parseRangeHeader('bytes=1000-', SIZE)).toEqual({ kind: 'unsatisfiable' });
	});

	it('meldet start > end als nicht erfüllbar', () => {
		expect(parseRangeHeader('bytes=500-100', SIZE)).toEqual({ kind: 'unsatisfiable' });
	});

	it('behandelt mehrere Bereiche wie "kein Range" — RFC 9110 erlaubt die volle Antwort', () => {
		expect(parseRangeHeader('bytes=0-99,200-299', SIZE)).toEqual({ kind: 'none' });
	});

	it('behandelt andere Einheiten wie "kein Range"', () => {
		expect(parseRangeHeader('items=0-99', SIZE)).toEqual({ kind: 'none' });
	});

	it('behandelt Unfug wie "kein Range"', () => {
		expect(parseRangeHeader('bytes=abc', SIZE)).toEqual({ kind: 'none' });
		expect(parseRangeHeader('bytes=-', SIZE)).toEqual({ kind: 'none' });
	});

	it('meldet jeden Range auf einer leeren Datei als nicht erfüllbar', () => {
		expect(parseRangeHeader('bytes=0-', 0)).toEqual({ kind: 'unsatisfiable' });
	});
});
