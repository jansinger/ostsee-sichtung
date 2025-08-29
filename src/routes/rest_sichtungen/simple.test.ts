import { describe, expect, it } from 'vitest';

describe('Simple Test to verify CI works', () => {
	it('should pass basic test', () => {
		expect(1 + 1).toBe(2);
	});

	it('should validate wind directions are strings', () => {
		const validDirections = ['N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'];
		validDirections.forEach(dir => {
			expect(typeof dir).toBe('string');
		});
	});

	it('should include SO in valid wind directions', () => {
		const validDirections = ['N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'];
		expect(validDirections).toContain('SO');
	});

	it('should include O in valid wind directions', () => {
		const validDirections = ['N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'];
		expect(validDirections).toContain('O');
	});
});