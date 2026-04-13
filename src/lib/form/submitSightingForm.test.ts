import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitSightingForm } from './submitSightingForm';

// Mock clearStorage
vi.mock('$lib/storage/localStorage', () => ({
	clearStorage: vi.fn()
}));

import { clearStorage } from '$lib/storage/localStorage';

// Minimal valid form values for testing
const validFormValues = {
	sightingDate: '2024-06-15',
	sightingTime: '14:30',
	species: 0,
	totalCount: 2,
	email: 'test@example.com',
	privacyConsent: true,
	latitude: 54.5,
	longitude: 10.5
} as Parameters<typeof submitSightingForm>[0];

function mockFetchResponse(body: object, status = 200): void {
	global.fetch = vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(body)
	});
}

describe('submitSightingForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('gibt { id, success: true } bei erfolgreicher Submission zurück', async () => {
		mockFetchResponse({ success: true, id: 42 }, 201);

		const result = await submitSightingForm(validFormValues);

		expect(result).toEqual({ id: 42, success: true });
	});

	it('ruft clearStorage bei erfolgreicher Submission auf', async () => {
		mockFetchResponse({ success: true, id: 42 }, 201);

		await submitSightingForm(validFormValues);

		expect(clearStorage).toHaveBeenCalledOnce();
	});

	it('sendet POST an /api/sightings mit JSON Content-Type', async () => {
		mockFetchResponse({ success: true, id: 1 }, 201);

		await submitSightingForm(validFormValues);

		expect(global.fetch).toHaveBeenCalledWith('/api/sightings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(validFormValues)
		});
	});

	it('wirft Error mit Server-Message wenn success=false', async () => {
		mockFetchResponse({ success: false, message: 'Validierung fehlgeschlagen' }, 400);

		await expect(submitSightingForm(validFormValues)).rejects.toThrow('Validierung fehlgeschlagen');
	});

	it('wirft Error mit Fallback-Message wenn keine Server-Message vorhanden', async () => {
		mockFetchResponse({ success: false }, 500);

		await expect(submitSightingForm(validFormValues)).rejects.toThrow(
			'Die Sichtung konnte nicht gespeichert werden'
		);
	});

	it('ruft clearStorage NICHT bei Fehler auf', async () => {
		mockFetchResponse({ success: false, message: 'Fehler' }, 400);

		await expect(submitSightingForm(validFormValues)).rejects.toThrow();
		expect(clearStorage).not.toHaveBeenCalled();
	});

	it('propagiert Netzwerkfehler wenn fetch fehlschlägt', async () => {
		global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

		await expect(submitSightingForm(validFormValues)).rejects.toThrow('Failed to fetch');
	});
});
