/**
 * Der Lösch-Button darf erst erscheinen, wenn eine Vorschau Fundstücke meldet —
 * sonst löscht ein Admin blind.
 */
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import CleanupPanel from './CleanupPanel.svelte';

function respondWith(report: Record<string, unknown>) {
	globalThis.fetch = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => report
	}) as unknown as typeof fetch;
}

const EMPTY = {
	retentionHours: 24,
	rowsFound: 0,
	filesFound: 0,
	rowsDeleted: 0,
	filesDeleted: 0,
	failed: 0,
	remaining: 0
};

describe('CleanupPanel', () => {
	it('zeigt vor der Vorschau keinen Lösch-Button', async () => {
		await render(CleanupPanel);

		await expect.element(page.getByRole('button', { name: 'Vorschau laden' })).toBeVisible();
		expect(page.getByRole('button', { name: 'Endgültig löschen' }).elements()).toHaveLength(0);
	});

	it('zeigt den Lösch-Button, sobald die Vorschau Fundstücke meldet', async () => {
		respondWith({ ...EMPTY, rowsFound: 4 });
		await render(CleanupPanel);

		await page.getByRole('button', { name: 'Vorschau laden' }).click();

		await expect.element(page.getByRole('button', { name: 'Endgültig löschen' })).toBeVisible();
	});

	it('bietet kein Löschen an, wenn nichts gefunden wurde', async () => {
		respondWith(EMPTY);
		await render(CleanupPanel);

		await page.getByRole('button', { name: 'Vorschau laden' }).click();

		await expect.element(page.getByText('0 Zeilen ohne Sichtung')).toBeVisible();
		expect(page.getByRole('button', { name: 'Endgültig löschen' }).elements()).toHaveLength(0);
	});

	it('meldet einen Fehlschlag, statt ihn zu verschlucken', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
		await render(CleanupPanel);

		await page.getByRole('button', { name: 'Vorschau laden' }).click();

		await expect.element(page.getByRole('alert')).toBeVisible();
	});
});
