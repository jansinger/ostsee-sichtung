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

	it('schweigt, wenn die Variable nicht gesetzt ist — dann gilt die Voreinstellung der Plattform', () => {
		expect(warnIfBodySizeLimitTooLow(undefined, 100 * MB)).toBeNull();
	});
});
