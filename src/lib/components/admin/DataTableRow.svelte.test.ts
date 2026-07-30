import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import DataTableRow from './DataTableRow.svelte';

type RowProps = Parameters<typeof DataTableRow>[1];

/**
 * Die Komponente rendert ein nacktes `<tr>`. Der Browser hängt es ohne
 * umgebende Tabelle direkt in den Container — für diese Prüfungen reicht das,
 * weil sie nur den Zelleninhalt betreffen und nicht das Tabellenlayout.
 */
function renderRow(props: RowProps) {
	render(DataTableRow, props);
}

describe('DataTableRow', () => {
	it('rendert Beschriftung und Wert', async () => {
		renderRow({ label: 'Fahrwasser', value: 'Kadetrinne' });

		await expect.element(page.getByText('Fahrwasser')).toBeVisible();
		await expect.element(page.getByText('Kadetrinne')).toBeVisible();
	});

	/**
	 * Der Ostsee-Status ist kein Wahrheitswert, sondern einer von vier Zuständen
	 * mit eigener Statusfarbe. Ohne diese Variante müsste die Detailansicht die
	 * beiden Rohflags wieder als zwei Häkchen zeigen — genau der Zustand, in dem
	 * Übersicht und Detailansicht auseinanderliefen.
	 */
	it('rendert einen Status-Badge samt Erklärung, wenn eine Badge-Klasse übergeben wird', async () => {
		renderRow({
			label: 'Ostsee-Status',
			value: 'außerhalb',
			badgeClass: 'badge-ghost',
			title: 'Position liegt nicht im Ostsee-Polygon.'
		});

		const badge = page.getByText('außerhalb');
		await expect.element(badge).toBeVisible();
		await expect.element(badge).toHaveClass(/badge-ghost/);
		// Der Tooltip trägt die Begründung — ohne ihn ist „außerhalb" eine
		// Behauptung ohne Herkunft.
		await expect.element(badge).toHaveAttribute('title', 'Position liegt nicht im Ostsee-Polygon.');
	});

	it('rendert ohne Badge-Klasse weiterhin reinen Text', async () => {
		renderRow({ label: 'Seezeichen', value: 'Fehmarnbelt' });

		await expect.element(page.getByText('Fehmarnbelt')).toBeVisible();
		expect(document.querySelector('.badge')).toBeNull();
	});
});
