import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import SightingStatusControl from './SightingStatusControl.svelte';

describe('SightingStatusControl', () => {
	it('markiert den aktuellen Zustand als ausgewählt', async () => {
		const screen = render(SightingStatusControl, {
			status: 'approved',
			sightingId: 1,
			onchange: vi.fn()
		});

		await expect.element(screen.getByRole('radio', { name: 'Freigegeben' })).toBeChecked();
		await expect.element(screen.getByRole('radio', { name: 'Offen' })).not.toBeChecked();
		await expect.element(screen.getByRole('radio', { name: 'Abgelehnt' })).not.toBeChecked();
	});

	/* Radiogruppe und nicht drei Buttons: Der Status ist eine Auswahl aus drei
	   einander ausschließenden Optionen. Ein Screenreader meldet damit
	   „Freigegeben, ausgewählt, 2 von 3" statt dreimal „Schaltfläche". */
	it('ist eine benannte Radiogruppe', async () => {
		const screen = render(SightingStatusControl, {
			status: 'open',
			sightingId: 1,
			onchange: vi.fn()
		});

		await expect.element(screen.getByRole('radiogroup', { name: 'Status' })).toBeInTheDocument();
	});

	it('meldet je Segment das Verdict, das den Zustand herstellt', async () => {
		const onchange = vi.fn();
		const screen = render(SightingStatusControl, { status: 'open', sightingId: 1, onchange });

		await screen.getByRole('radio', { name: 'Freigegeben' }).click();
		expect(onchange).toHaveBeenCalledWith('approve');

		await screen.getByRole('radio', { name: 'Abgelehnt' }).click();
		expect(onchange).toHaveBeenCalledWith('reject');
	});

	it('meldet nichts, wenn der aktuelle Zustand erneut gewählt wird', async () => {
		const onchange = vi.fn();
		const screen = render(SightingStatusControl, { status: 'approved', sightingId: 1, onchange });

		await screen.getByRole('radio', { name: 'Freigegeben' }).click();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('sperrt alle Segmente, solange ein Wechsel läuft', async () => {
		const onchange = vi.fn();
		const screen = render(SightingStatusControl, {
			status: 'open',
			sightingId: 1,
			busy: true,
			onchange
		});

		await expect.element(screen.getByRole('radio', { name: 'Freigegeben' })).toBeDisabled();
		await screen.getByRole('radio', { name: 'Freigegeben' }).click({ force: true });
		expect(onchange).not.toHaveBeenCalled();
	});

	/* Zwei Controls auf einer Seite (Tabellenzeilen) dürfen sich nicht
	   gegenseitig entwählen — jede Gruppe braucht einen eigenen `name`. */
	it('vergibt je Sichtung einen eigenen Gruppennamen', async () => {
		const screen = render(SightingStatusControl, {
			status: 'open',
			sightingId: 42,
			onchange: vi.fn()
		});

		const radio = screen.getByRole('radio', { name: 'Offen' });
		await expect.element(radio).toHaveAttribute('name', 'sighting-status-42');
	});

	it('zeigt in der kompakten Größe keinen sichtbaren Text', async () => {
		const screen = render(SightingStatusControl, {
			status: 'open',
			sightingId: 1,
			size: 'sm',
			onchange: vi.fn()
		});

		// Die Beschriftung existiert weiter für Screenreader, nur nicht sichtbar.
		await expect.element(screen.getByRole('radio', { name: 'Freigegeben' })).toBeInTheDocument();
		expect(screen.container.textContent).not.toContain('Freigegeben');
	});
});
