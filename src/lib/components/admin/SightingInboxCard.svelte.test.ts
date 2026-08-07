import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import SightingInboxCard from './SightingInboxCard.svelte';
import type { SightingSelect } from '$lib/server/db/schema';

const basisSichtung = {
	id: 42,
	created: new Date('2026-08-01T10:00:00Z'),
	sightingDate: new Date('2026-07-30T08:00:00Z'),
	species: 0,
	totalCount: 3,
	juvenileCount: 1,
	isDead: 0,
	email: 'melder@example.com',
	firstName: 'Kim',
	lastName: 'Muster',
	spamScore: null,
	inBalticSea: 1,
	inBalticSeaGeo: 1
} as unknown as SightingSelect;

const noop = () => {};

describe('SightingInboxCard', () => {
	it('zeigt Tierart, Anzahl, E-Mail und Meldedatum', async () => {
		const screen = render(SightingInboxCard, {
			sighting: basisSichtung,
			images: [],
			busy: false,
			onApprove: noop,
			onReject: noop
		});
		await expect.element(screen.getByText(/Schweinswal/)).toBeInTheDocument();
		await expect.element(screen.getByText('melder@example.com')).toBeInTheDocument();
	});

	it('zeigt Fahrwasser/Ort, wenn angegeben', async () => {
		const screen = render(SightingInboxCard, {
			sighting: { ...basisSichtung, waterway: 'Kieler Förde, Höhe Laboe' } as SightingSelect,
			images: [],
			busy: false,
			onApprove: noop,
			onReject: noop
		});
		await expect.element(screen.getByText(/Kieler Förde, Höhe Laboe/)).toBeInTheDocument();
	});

	it('zeichnet einen Totfund aus, eine Lebendsichtung nicht', async () => {
		const tot = render(SightingInboxCard, {
			sighting: { ...basisSichtung, isDead: 1 } as SightingSelect,
			images: [],
			busy: false,
			onApprove: noop,
			onReject: noop
		});
		await expect.element(tot.getByText('Totfund')).toBeInTheDocument();
	});

	it('Spam-Score: null → „–", hoher Score → error-Badge', async () => {
		const hoch = render(SightingInboxCard, {
			sighting: { ...basisSichtung, spamScore: 7 } as SightingSelect,
			images: [],
			busy: false,
			onApprove: noop,
			onReject: noop
		});
		const badge = hoch.getByTestId('spam-badge');
		await expect.element(badge).toHaveClass(/badge-error/);
	});

	it('Freigeben/Ablehnen rufen die Callbacks, busy deaktiviert beide', async () => {
		const onApprove = vi.fn();
		const onReject = vi.fn();
		const screen = render(SightingInboxCard, {
			sighting: basisSichtung,
			images: [],
			busy: false,
			onApprove,
			onReject
		});
		await screen.getByRole('button', { name: 'Freigeben' }).click();
		expect(onApprove).toHaveBeenCalledOnce();
		await screen.getByRole('button', { name: 'Ablehnen' }).click();
		expect(onReject).toHaveBeenCalledOnce();
	});

	it('rendert Bild-Vorschauen über /api/media', async () => {
		const screen = render(SightingInboxCard, {
			sighting: basisSichtung,
			images: [{ id: 1, filePath: '2026/08/foo.jpg', originalName: 'foo.jpg' }],
			busy: false,
			onApprove: noop,
			onReject: noop
		});
		const img = screen.getByRole('img', { name: 'foo.jpg' });
		await expect.element(img).toHaveAttribute('src', '/api/media/2026/08/foo.jpg');
	});
});
