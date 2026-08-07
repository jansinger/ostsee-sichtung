import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import SightingInboxCard from './SightingInboxCard.svelte';
import type { SightingSelect } from '$lib/server/db/schema';

/* actionLabel ('Freigeben'/'Ablehnen') trägt zufällig dieselben Wörter wie die
   frühere, fest verdrahtete Beschriftung — ein Test gegen die echte Quelle
   bewiese damit nicht, dass die Karte aus ihr liest. Der Mock trägt bewusst
   abweichende Werte, damit ein Rückfall auf feste Strings den Test rot macht. */
vi.mock('./sightingStatus', async () => {
	const actual = await vi.importActual<typeof import('./sightingStatus')>('./sightingStatus');
	return {
		...actual,
		SIGHTING_STATUS_PRESENTATION: {
			...actual.SIGHTING_STATUS_PRESENTATION,
			approved: { ...actual.SIGHTING_STATUS_PRESENTATION.approved, actionLabel: 'TESTFREIGABE' },
			rejected: { ...actual.SIGHTING_STATUS_PRESENTATION.rejected, actionLabel: 'TESTABLEHNUNG' }
		}
	};
});

const { SIGHTING_STATUS_PRESENTATION } = await import('./sightingStatus');

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
		await screen
			.getByRole('button', { name: SIGHTING_STATUS_PRESENTATION.approved.actionLabel })
			.click();
		expect(onApprove).toHaveBeenCalledOnce();
		await screen
			.getByRole('button', { name: SIGHTING_STATUS_PRESENTATION.rejected.actionLabel })
			.click();
		expect(onReject).toHaveBeenCalledOnce();
	});

	/* Die Karte benennt die Triage-Ziele wie Tabelle und Detailansicht — sonst
	   heißt derselbe Vorgang je nach Seite anders. Zustandswort und
	   Handlungswort sind verschieden: Das Segment heißt „Freigegeben", der
	   Knopf „Freigeben". */
	it('beschriftet die Aktionen aus der gemeinsamen Statusquelle', async () => {
		const screen = render(SightingInboxCard, {
			sighting: basisSichtung,
			images: [],
			busy: false,
			onApprove: vi.fn(),
			onReject: vi.fn()
		});

		await expect
			.element(
				screen.getByRole('button', { name: SIGHTING_STATUS_PRESENTATION.approved.actionLabel })
			)
			.toBeInTheDocument();
		await expect
			.element(
				screen.getByRole('button', { name: SIGHTING_STATUS_PRESENTATION.rejected.actionLabel })
			)
			.toBeInTheDocument();
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
