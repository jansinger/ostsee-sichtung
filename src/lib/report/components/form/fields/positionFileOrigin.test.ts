import { describe, expect, it } from 'vitest';
import { isPositionUid, withPositionUid, withoutPositionUid } from './positionFileOrigin';

describe('positionFileOrigin — reine Mengen-Regeln', () => {
	it('nimmt eine uid auf', () => {
		expect(withPositionUid([], 'a')).toEqual(['a']);
	});

	it('nimmt dieselbe uid nicht doppelt auf', () => {
		expect(withPositionUid(['a'], 'a')).toEqual(['a']);
	});

	it('behält bestehende uids beim Hinzufügen', () => {
		expect(withPositionUid(['a'], 'b')).toEqual(['a', 'b']);
	});

	it('entfernt eine uid', () => {
		expect(withoutPositionUid(['a', 'b'], 'a')).toEqual(['b']);
	});

	it('bleibt beim Entfernen einer unbekannten uid unverändert', () => {
		expect(withoutPositionUid(['a'], 'zzz')).toEqual(['a']);
	});

	it('erkennt enthaltene und nicht enthaltene uids', () => {
		expect(isPositionUid(['a'], 'a')).toBe(true);
		expect(isPositionUid(['a'], 'b')).toBe(false);
		expect(isPositionUid([], 'a')).toBe(false);
	});

	it('verändert die übergebene Liste nicht', () => {
		const uids = ['a'];
		withPositionUid(uids, 'b');
		withoutPositionUid(uids, 'a');
		expect(uids).toEqual(['a']);
	});
});
