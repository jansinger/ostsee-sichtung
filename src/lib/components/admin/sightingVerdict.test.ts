import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitVerdict } from './sightingVerdict';

vi.mock('$lib/stores/toastState.svelte', () => ({
	toast: { error: vi.fn(), success: vi.fn() }
}));
vi.mock('$lib/logger', () => ({
	createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

describe('submitVerdict', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('sendet PATCH mit verdict im Body und meldet Erfolg', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
		const ok = await submitVerdict(42, 'approve');
		expect(ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/sightings/42/verify',
			expect.objectContaining({
				method: 'PATCH',
				body: JSON.stringify({ verdict: 'approve' })
			})
		);
	});

	it("schickt 'reset' unverändert durch — die Tabelle hebt damit eine Ablehnung auf", async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

		expect(await submitVerdict(42, 'reset')).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/sightings/42/verify',
			expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ verdict: 'reset' }) })
		);
	});

	it('meldet false bei HTTP-Fehler und bei Netzwerkfehler', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ message: 'kaputt' }), { status: 500 })
		);
		expect(await submitVerdict(42, 'reject')).toBe(false);

		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
		expect(await submitVerdict(42, 'reject')).toBe(false);
	});
});
