/**
 * @fileoverview Das `mediaUpload`-Flag beim Bearbeiten einer Sichtung.
 *
 * Der interessante Fall ist die Asymmetrie: Eine angehängte Datei setzt das
 * Flag, das Fehlen einer Datei löscht es aber nicht — sonst verlöre jede
 * Bearbeitung einer Sichtung im Zustand „Foto angekündigt, folgt per E-Mail"
 * genau die Aussage, auf der die Admin-Arbeitsliste steht.
 */
import { describe, expect, it } from 'vitest';

import { resolveMediaUploadFlag } from './mediaUploadFlag';

describe('resolveMediaUploadFlag', () => {
	it('setzt das Flag, wenn eine Datei angehängt ist', () => {
		expect(resolveMediaUploadFlag({ current: 0, attachedFileCount: 1 })).toBe(true);
	});

	it('löscht ein gesetztes Flag nicht, wenn keine Datei angehängt ist', () => {
		// „Angekündigt, aber noch nicht eingetroffen" — der Zustand, auf dem der
		// Filter `announced_missing` steht. Eine Bearbeitung darf ihn nicht tilgen.
		expect(resolveMediaUploadFlag({ current: 1, attachedFileCount: 0 })).toBe(true);
	});

	it('bleibt aus, solange weder Flag noch Datei vorliegen', () => {
		expect(resolveMediaUploadFlag({ current: 0, attachedFileCount: 0 })).toBe(false);
	});

	it('nimmt das Flag als DB-Integer wie als Formular-Boolean entgegen', () => {
		expect(resolveMediaUploadFlag({ current: true, attachedFileCount: 0 })).toBe(true);
		expect(resolveMediaUploadFlag({ current: false, attachedFileCount: 0 })).toBe(false);
		expect(resolveMediaUploadFlag({ current: null, attachedFileCount: 0 })).toBe(false);
		expect(resolveMediaUploadFlag({ current: undefined, attachedFileCount: 2 })).toBe(true);
	});
});
