/**
 * Der Lösch-Button darf erst erscheinen, wenn eine Vorschau Fundstücke meldet —
 * sonst löscht ein Admin blind. Und er löscht nicht selbst: Wie bei
 * `ResetSettingsButton` öffnet er den gemeinsamen `ConfirmDialog`, erst dessen
 * „Endgültig löschen" räumt auf.
 */
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import CleanupPanel from './CleanupPanel.svelte';

type FetchMock = ReturnType<typeof vi.fn>;

function respondWith(report: Record<string, unknown>): FetchMock {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => report
	});
	globalThis.fetch = fetchMock as unknown as typeof fetch;
	return fetchMock;
}

/** Wurde tatsächlich aufgeräumt — nicht nur die Vorschau geladen? */
function hatAufgeraeumt(fetchMock: FetchMock): boolean {
	return fetchMock.mock.calls.some(
		(call) => typeof call[0] === 'string' && call[0].includes('mode=execute')
	);
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

/** Vorschau mit Fundstücken laden, damit der Lösch-Knopf erscheint. */
async function mitFundstuecken(): Promise<FetchMock> {
	const fetchMock = respondWith({ ...EMPTY, rowsFound: 4 });
	await render(CleanupPanel);

	await page.getByRole('button', { name: 'Vorschau laden' }).click();
	await expect.element(page.getByRole('button', { name: 'Löschen', exact: true })).toBeVisible();

	return fetchMock;
}

describe('CleanupPanel', () => {
	it('zeigt vor der Vorschau keinen Lösch-Button', async () => {
		await render(CleanupPanel);

		await expect.element(page.getByRole('button', { name: 'Vorschau laden' })).toBeVisible();
		expect(page.getByRole('button', { name: 'Löschen', exact: true }).elements()).toHaveLength(0);
	});

	it('zeigt den Lösch-Button, sobald die Vorschau Fundstücke meldet', async () => {
		respondWith({ ...EMPTY, rowsFound: 4 });
		await render(CleanupPanel);

		await page.getByRole('button', { name: 'Vorschau laden' }).click();

		await expect.element(page.getByRole('button', { name: 'Löschen', exact: true })).toBeVisible();
	});

	it('bietet kein Löschen an, wenn nichts gefunden wurde', async () => {
		respondWith(EMPTY);
		await render(CleanupPanel);

		await page.getByRole('button', { name: 'Vorschau laden' }).click();

		await expect.element(page.getByText('0 Zeilen ohne Sichtung')).toBeVisible();
		expect(page.getByRole('button', { name: 'Löschen', exact: true }).elements()).toHaveLength(0);
	});

	it('meldet einen Fehlschlag, statt ihn zu verschlucken', async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
		await render(CleanupPanel);

		await page.getByRole('button', { name: 'Vorschau laden' }).click();

		await expect.element(page.getByRole('alert')).toBeVisible();
	});
});

describe('CleanupPanel — Bestätigungsdialog', () => {
	it('fragt nicht mehr über window.confirm', async () => {
		const nativesConfirm = vi.spyOn(window, 'confirm');
		await mitFundstuecken();

		await page.getByRole('button', { name: 'Löschen', exact: true }).click();

		expect(nativesConfirm).not.toHaveBeenCalled();
		nativesConfirm.mockRestore();
	});

	it('öffnet den Dialog, statt sofort aufzuräumen', async () => {
		const fetchMock = await mitFundstuecken();

		await page.getByRole('button', { name: 'Löschen', exact: true }).click();

		await expect
			.element(page.getByRole('heading', { name: 'Verwaiste Uploads löschen' }))
			.toBeVisible();
		expect(hatAufgeraeumt(fetchMock)).toBe(false);
	});

	it('nennt im Dialog die Unumkehrbarkeit', async () => {
		await mitFundstuecken();

		await page.getByRole('button', { name: 'Löschen', exact: true }).click();

		await expect.element(page.getByText(/rückgängig/i)).toBeVisible();
	});

	it('räumt erst beim Bestätigen auf', async () => {
		const fetchMock = await mitFundstuecken();

		await page.getByRole('button', { name: 'Löschen', exact: true }).click();
		await page.getByRole('button', { name: 'Endgültig löschen' }).click();

		await vi.waitFor(() => expect(hatAufgeraeumt(fetchMock)).toBe(true));
	});

	it('räumt beim Abbrechen nicht auf', async () => {
		const fetchMock = await mitFundstuecken();

		await page.getByRole('button', { name: 'Löschen', exact: true }).click();
		await page.getByRole('button', { name: 'Abbrechen' }).click();

		await vi.waitFor(() => expect(document.querySelector('dialog')?.open ?? false).toBe(false));
		expect(hatAufgeraeumt(fetchMock)).toBe(false);
	});

	it('räumt beim Schließen per ESC nicht auf', async () => {
		const fetchMock = await mitFundstuecken();

		await page.getByRole('button', { name: 'Löschen', exact: true }).click();
		await vi.waitFor(() => expect(document.querySelector('dialog')?.open).toBe(true));

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(document.querySelector('dialog')?.open ?? false).toBe(false));
		expect(hatAufgeraeumt(fetchMock)).toBe(false);
	});
});
