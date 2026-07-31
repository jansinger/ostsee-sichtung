import { describe, expect, it } from 'vitest';
import { isEmptySourceFile } from './migrate-old-uploads';

describe('isEmptySourceFile', () => {
	it('erkennt eine 0-Byte-Quelldatei als leer', () => {
		expect(isEmptySourceFile(0)).toBe(true);
	});

	it('lässt eine Datei mit Inhalt durch', () => {
		expect(isEmptySourceFile(1)).toBe(false);
		expect(isEmptySourceFile(1024)).toBe(false);
	});
});
