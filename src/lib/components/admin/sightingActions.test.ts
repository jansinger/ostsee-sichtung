/**
 * Die beiden Sichtungs-Aktionen aus der Admin-Tabelle („Interne Benachrichtigung
 * testweise senden", „Eintrag löschen") liegen hier, weil sie ab sofort an zwei
 * Aufrufstellen hängen: Tabelle und Detailansicht. Doppelt gepflegt wären es zwei
 * Fehlermeldungs-Dialekte für denselben Vorgang.
 *
 * `deleteSighting` meldet den Ausgang zurück, statt selbst zu navigieren — die
 * Tabelle lädt neu, die Detailansicht muss die gelöschte Sichtung verlassen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastCalls = vi.hoisted(() => ({
	info: vi.fn(() => 'toast-id'),
	success: vi.fn(),
	error: vi.fn(),
	remove: vi.fn()
}));

vi.mock('$lib/stores/toastState.svelte', () => ({ toast: toastCalls }));
vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

import { deleteSighting, sendTestEmail } from './sightingActions';

/*
 * `vi.stubGlobal` statt einer Zuweisung an `globalThis.fetch`: Vitest merkt sich
 * den Originalwert, `vi.unstubAllGlobals()` unten stellt ihn wieder her. Eine
 * Zuweisung bliebe für die ganze Worker-Instanz stehen und wirkte in jede
 * nachfolgende Testdatei hinein. Dieselbe Form wie in submitSightingForm.test.ts
 * und configStore.test.ts.
 */
function mockFetch(response: { ok: boolean; body: unknown }) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: response.ok,
		json: async () => response.body
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

function failingFetch() {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('sendTestEmail', () => {
	it('sendet an den Admin-Endpunkt und meldet Erfolg', async () => {
		const fetchMock = mockFetch({ ok: true, body: { success: true, message: 'gesendet' } });

		await sendTestEmail(42);

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/admin/test-email',
			expect.objectContaining({ method: 'POST' })
		);
		const init = fetchMock.mock.calls[0]![1] as RequestInit;
		expect(JSON.parse(init.body as string)).toEqual({
			sightingId: 42,
			testType: 'sighting'
		});
		expect(toastCalls.success).toHaveBeenCalled();
	});

	it('räumt den Lade-Toast auch im Fehlerfall ab', async () => {
		mockFetch({ ok: false, body: { success: false, error: 'kaputt' } });

		await sendTestEmail(42);

		expect(toastCalls.remove).toHaveBeenCalledWith('toast-id');
		expect(toastCalls.error).toHaveBeenCalled();
		expect(toastCalls.success).not.toHaveBeenCalled();
	});

	it('meldet einen Netzwerkfehler, statt ihn zu verschlucken', async () => {
		failingFetch();

		await sendTestEmail(42);

		expect(toastCalls.remove).toHaveBeenCalledWith('toast-id');
		expect(toastCalls.error).toHaveBeenCalled();
	});
});

describe('deleteSighting', () => {
	it('löscht über die Sichtungs-API und meldet Erfolg zurück', async () => {
		const fetchMock = mockFetch({ ok: true, body: { success: true } });

		await expect(deleteSighting(7)).resolves.toBe(true);

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/sightings/7',
			expect.objectContaining({ method: 'DELETE' })
		);
		expect(toastCalls.success).toHaveBeenCalled();
	});

	it('meldet false, wenn der Server ablehnt', async () => {
		mockFetch({ ok: false, body: { error: 'nicht erlaubt' } });

		await expect(deleteSighting(7)).resolves.toBe(false);

		expect(toastCalls.error).toHaveBeenCalledWith(
			'nicht erlaubt',
			expect.objectContaining({ title: 'Fehler' })
		);
	});

	it('meldet false bei einem Netzwerkfehler', async () => {
		failingFetch();

		await expect(deleteSighting(7)).resolves.toBe(false);

		expect(toastCalls.error).toHaveBeenCalled();
	});
});
