/**
 * @fileoverview Tastatur im Warteschlangen-Modus der Detailansicht.
 *
 * Dieselben Tasten wie im Eingang, dieselbe Bedeutung — nur wandert nicht der
 * Fokus, sondern die Seite. Die bestehenden Sperren (Eingabefelder, Dialoge)
 * gelten unverändert; in der Detailansicht ist das keine Formsache, sondern
 * nötig: Sie enthält `MediaModal` und `DeleteDialog`, und ein „a" im offenen
 * Dialog würde sonst die Sichtung dahinter freigeben.
 */
import { describe, expect, it } from 'vitest';
import { resolveInboxShortcut } from '$lib/components/admin/adminTriageShortcuts';

describe('Tastatur der Detailansicht', () => {
	it('nutzt dieselbe Zuordnung wie der Eingang', () => {
		const ereignis = { ctrlKey: false, metaKey: false, altKey: false, target: null };

		expect(resolveInboxShortcut({ ...ereignis, key: 'j' })).toBe('focusNext');
		expect(resolveInboxShortcut({ ...ereignis, key: 'k' })).toBe('focusPrevious');
		expect(resolveInboxShortcut({ ...ereignis, key: 'a' })).toBe('approve');
		expect(resolveInboxShortcut({ ...ereignis, key: 'r' })).toBe('reject');
	});

	it('schweigt im offenen Dialog', () => {
		const imDialog = {
			ctrlKey: false,
			metaKey: false,
			altKey: false,
			key: 'a',
			target: { closest: (selektor: string) => (selektor.includes('dialog') ? {} : null) }
		};

		expect(resolveInboxShortcut(imDialog)).toBeNull();
	});
});
