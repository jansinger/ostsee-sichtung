/**
 * @fileoverview `createUndoMemory` DOM-frei getestet — er hält reinen Zustand
 * (State + Timer) und braucht dafür kein Rendering. Deckt genau die zwei
 * Verhaltensweisen ab, die vorher ungetestet waren: den Verfall nach `ms`
 * und die ID-gebundene Ablösung durch eine neuere Entscheidung.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createUndoMemory, type UndoEntry } from './undoMemory.svelte';

function eintrag(overrides: Partial<UndoEntry> = {}): UndoEntry {
	return { id: 42, href: '/admin/42', verdict: 'approve', ...overrides };
}

describe('createUndoMemory', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('merkt eine Entscheidung', () => {
		const memory = createUndoMemory(1000);
		memory.merken(eintrag());
		expect(memory.current).toEqual(eintrag());
	});

	it('verfällt nach Ablauf der übergebenen Frist', () => {
		const memory = createUndoMemory(1000);
		memory.merken(eintrag());

		vi.advanceTimersByTime(999);
		expect(memory.current).not.toBeNull();

		vi.advanceTimersByTime(1);
		expect(memory.current).toBeNull();
	});

	it('eine neue Entscheidung löst die alte samt ihrem Timer ab', () => {
		const memory = createUndoMemory(1000);
		memory.merken(eintrag({ id: 42 }));

		vi.advanceTimersByTime(800);
		memory.merken(eintrag({ id: 43 }));

		// Der alte Timer (der bei t=1000 gefeuert hätte) darf die neue
		// Entscheidung nicht mehr löschen können.
		vi.advanceTimersByTime(200);
		expect(memory.current).toEqual(eintrag({ id: 43 }));

		// Der neue, eigene Timer der Entscheidung #43 verfällt regulär.
		vi.advanceTimersByTime(800);
		expect(memory.current).toBeNull();
	});

	it('vergiss(id) mit einer fremden ID lässt den Eintrag stehen', () => {
		const memory = createUndoMemory(1000);
		memory.merken(eintrag({ id: 42 }));

		memory.vergiss(43);

		expect(memory.current).toEqual(eintrag({ id: 42 }));
		// Auch der Timer läuft unbeeinflusst weiter.
		vi.advanceTimersByTime(1000);
		expect(memory.current).toBeNull();
	});

	it('vergiss(id) mit der passenden ID räumt Entscheidung und Timer', () => {
		const memory = createUndoMemory(1000);
		memory.merken(eintrag({ id: 42 }));

		memory.vergiss(42);
		expect(memory.current).toBeNull();

		// Kein Timer mehr aktiv — nichts läuft nach Ablauf der Frist ins Leere.
		expect(vi.getTimerCount()).toBe(0);
	});

	it('dispose() stoppt den Timer, ohne die Entscheidung zu löschen', () => {
		const memory = createUndoMemory(1000);
		memory.merken(eintrag());

		memory.dispose();

		expect(memory.current).toEqual(eintrag());
		expect(vi.getTimerCount()).toBe(0);
	});
});
