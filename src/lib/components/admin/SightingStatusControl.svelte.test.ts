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

	/* Reproduziert den Fall aus dem Review: Nach einem fehlgeschlagenen
	   Statuswechsel lädt die aufrufende Seite nicht neu (`submitVerdict` gibt
	   `false` zurück) — das angeklickte Radio steht im DOM auf dem neuen Wert,
	   `status` bleibt auf dem alten. Ein Klick auf das ursprüngliche Segment
	   ist dann eine Korrektur und muss durchgehen, nicht verschluckt werden. */
	it('meldet die Korrektur, wenn DOM und status-Prop auseinanderlaufen', async () => {
		const onchange = vi.fn();
		const screen = render(SightingStatusControl, { status: 'open', sightingId: 1, onchange });

		// Simuliert den gescheiterten Wechsel: Der Klick setzt das DOM-Radio auf
		// "Freigegeben", das onchange-Callback (analog zum fehlschlagenden
		// submitVerdict) aktualisiert das status-Prop aber nicht.
		await screen.getByRole('radio', { name: 'Freigegeben' }).click();
		onchange.mockClear();

		// Die Korrektur: zurück auf das Segment, das dem status-Prop entspricht.
		await screen.getByRole('radio', { name: 'Offen' }).click();
		expect(onchange).toHaveBeenCalledWith('reset');
	});

	it('sperrt alle Segmente, solange ein Wechsel läuft', async () => {
		const onchange = vi.fn();
		const screen = render(SightingStatusControl, {
			status: 'open',
			sightingId: 1,
			busy: true,
			onchange
		});

		await expect.element(screen.getByRole('radio', { name: 'Offen' })).toBeDisabled();
		await expect.element(screen.getByRole('radio', { name: 'Freigegeben' })).toBeDisabled();
		await expect.element(screen.getByRole('radio', { name: 'Abgelehnt' })).toBeDisabled();

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

	/* Merge-Blocker (Befund 1): `checked={active}` war unkontrolliert. Nach
	   einem Advance im Warteschlangen-Modus (`+page.svelte` springt ohne
	   `invalidateAll()` zur nächsten offenen Sichtung) bekommt die Komponente
	   dieselbe Instanz mit neuer `sightingId`, aber erneut `status: 'open'` —
	   der Stapel liefert nur offene Sichtungen. Der berechnete `active`-Wert
	   für das Segment "Offen" ändert sich dabei NICHT (vorher wie nachher
	   `true`), also löste Svelte kein DOM-Update aus, und das zuvor
	   angeklickte "Freigegeben"-Radio blieb im DOM `checked` stehen. Ein
	   zweiter Klick auf "Freigegeben" feuerte dadurch kein `change` — die
	   zweite Freigabe in Folge wurde ohne jede Rückmeldung verschluckt.
	   `rerender` mit gleichem `status`, neuer `sightingId` bildet den
	   Advance-Sprung nach. */
	it('meldet einen zweiten Klick nach einem Advance auf eine andere, ebenfalls offene Sichtung', async () => {
		const onchange = vi.fn();
		const screen = render(SightingStatusControl, { status: 'open', sightingId: 42, onchange });

		await screen.getByRole('radio', { name: 'Freigegeben' }).click();
		expect(onchange).toHaveBeenCalledWith('approve');
		onchange.mockClear();

		// Advance: neue Sichtung, die Warteschlange liefert nur offene.
		await screen.rerender({ status: 'open', sightingId: 43, onchange });

		// Das DOM muss die neue Sichtung als "Offen" zeigen — nicht mehr als
		// "Freigegeben" hängen bleiben, obwohl `active` für 'open' unverändert
		// `true` war.
		await expect.element(screen.getByRole('radio', { name: 'Offen' })).toBeChecked();
		await expect.element(screen.getByRole('radio', { name: 'Freigegeben' })).not.toBeChecked();

		await screen.getByRole('radio', { name: 'Freigegeben' }).click();
		expect(onchange).toHaveBeenCalledWith('approve');
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
