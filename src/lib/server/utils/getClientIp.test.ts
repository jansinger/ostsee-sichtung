import { describe, it, expect } from 'vitest';
import { getClientIp } from './getClientIp';

describe('getClientIp', () => {
	it('returns the result of getClientAddress when it does not throw', () => {
		const result = getClientIp(() => '1.2.3.4');
		expect(result).toBe('1.2.3.4');
	});

	it('returns first X-Forwarded-For entry when getClientAddress throws and header is present', () => {
		const request = new Request('https://example.com', {
			headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' }
		});
		const result = getClientIp(() => {
			throw new Error('Could not determine clientAddress');
		}, request);
		expect(result).toBe('10.0.0.1');
	});

	it('trims whitespace from X-Forwarded-For entries', () => {
		const request = new Request('https://example.com', {
			headers: { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' }
		});
		const result = getClientIp(() => {
			throw new Error();
		}, request);
		expect(result).toBe('10.0.0.1');
	});

	it('returns null when getClientAddress throws and no request is provided', () => {
		const result = getClientIp(() => {
			throw new Error('Could not determine clientAddress');
		});
		expect(result).toBeNull();
	});

	it('returns null when getClientAddress throws and X-Forwarded-For header is absent', () => {
		const request = new Request('https://example.com');
		const result = getClientIp(() => {
			throw new Error();
		}, request);
		expect(result).toBeNull();
	});
});
