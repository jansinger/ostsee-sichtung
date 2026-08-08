/**
 * @fileoverview Textalternative und Hervorhebung des Balkendiagramms
 *
 * Ein `role="img"` nimmt den Inhalt des SVG aus dem Accessibility-Tree — was
 * darin an Zahlen steht, ist für Screenreader nicht vorhanden. Die Alternative
 * ist deshalb keine Kür, sondern die einzige Fassung der Daten, die dort ankommt
 * (WCAG 1.1.1). Sie kann verschwinden, ohne dass irgendetwas bricht; genau
 * dagegen laufen diese Tests.
 */

import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import BarChart from './BarChart.svelte';

const DATEN = [
	{ label: '2024', value: 120 },
	{ label: '2025', value: 340, highlighted: true }
];

describe('BarChart', () => {
	it('benennt das Diagramm für Screenreader', async () => {
		render(BarChart, {
			data: DATEN,
			caption: 'Jahrestrends: freigegebene Sichtungen je Jahr',
			categoryLabel: 'Jahr',
			valueLabel: 'Sichtungen'
		});

		await expect
			.element(page.getByRole('img', { name: 'Jahrestrends: freigegebene Sichtungen je Jahr' }))
			.toBeInTheDocument();
	});

	it('gibt jeden Wert zusätzlich als Tabelle aus', async () => {
		render(BarChart, {
			data: DATEN,
			caption: 'Jahrestrends',
			categoryLabel: 'Jahr',
			valueLabel: 'Sichtungen'
		});

		await page.getByText('Werte als Tabelle').click();

		const tabelle = page.getByRole('table');
		await expect.element(tabelle).toBeInTheDocument();
		await expect.element(page.getByRole('rowheader', { name: /2024/ })).toBeInTheDocument();
		await expect.element(page.getByRole('cell', { name: '340' })).toBeInTheDocument();
	});

	it('benennt die Hervorhebung im Text, nicht nur in der Farbe', async () => {
		render(BarChart, {
			data: DATEN,
			caption: 'Jahrestrends',
			categoryLabel: 'Jahr',
			valueLabel: 'Sichtungen',
			highlightNote: 'ausgewähltes Jahr'
		});

		await page.getByText('Werte als Tabelle').click();

		// WCAG 1.4.1: Farbe darf nicht der einzige Träger der Aussage sein.
		await expect.element(page.getByText('(ausgewähltes Jahr)')).toBeInTheDocument();
	});

	it('rendert eine leere Datenreihe ohne Balken statt mit kaputten Maßen', async () => {
		const { container } = render(BarChart, {
			data: [],
			caption: 'Ohne Daten',
			categoryLabel: 'Jahr',
			valueLabel: 'Sichtungen'
		});

		expect(container.querySelectorAll('rect')).toHaveLength(0);
	});
});

/**
 * Der höchste Balken reicht bis an die Achsenobergrenze — bei zwölf Monaten ist
 * das jeden Monat einer. Die Wertbeschriftung wurde dabei auf den oberen Rand
 * der Zeichenfläche geklemmt und landete damit **im** Balken: dunkle Schrift auf
 * dunkler Fläche, dazu auf der Achsenlinie. Gemessen am 2026-08-08 auf
 * `/admin/statistics?jahr=2025` (August: 245 von 250).
 */
describe('BarChart — Wertbeschriftung am höchsten Balken', () => {
	const VOLLE_HOEHE = [
		{ label: 'Jul', value: 40 },
		{ label: 'Aug', value: 100 }
	];

	it('setzt den Wert über den Balken statt hinein', async () => {
		const { container } = render(BarChart, {
			data: VOLLE_HOEHE,
			caption: 'Saisonalität',
			categoryLabel: 'Monat',
			valueLabel: 'Sichtungen'
		});

		const hoechster = [...container.querySelectorAll('rect')].reduce((a, b) =>
			Number(a.getAttribute('height')) >= Number(b.getAttribute('height')) ? a : b
		);
		const wert = [...container.querySelectorAll('text')].find((t) => t.textContent?.trim() === '100');

		expect(wert, 'Wertbeschriftung des höchsten Balkens fehlt').toBeDefined();
		expect(Number(wert!.getAttribute('y'))).toBeLessThan(Number(hoechster.getAttribute('y')));
	});

	it('hält die Beschriftung innerhalb der Zeichenfläche', async () => {
		const { container } = render(BarChart, {
			data: VOLLE_HOEHE,
			caption: 'Saisonalität',
			categoryLabel: 'Monat',
			valueLabel: 'Sichtungen'
		});

		// Gemessen wird die gerenderte Lage, nicht das `y`-Attribut: Die
		// Zeichenfläche ist verschoben, ein negatives `y` liegt darin völlig
		// regulär im Kopfband. Abgeschnitten wäre die Beschriftung erst, wenn sie
		// über den Rand des SVG hinausragt.
		const svg = container.querySelector('svg')!;
		const rahmen = svg.getBoundingClientRect();

		for (const text of svg.querySelectorAll('text')) {
			const box = text.getBoundingClientRect();
			expect(box.top, 'Beschriftung ragt oben aus dem Diagramm').toBeGreaterThanOrEqual(
				rahmen.top - 0.5
			);
		}
	});

	it('zeigt das Achsenmaximum nur, wenn die Balken selbst keine Werte tragen', async () => {
		// Beides zusammen bedeutet dieselbe Zahl zweimal an fast derselben Stelle —
		// und genau dort kollidierte die Beschriftung des höchsten Balkens.
		const { container } = render(BarChart, {
			data: VOLLE_HOEHE,
			caption: 'Saisonalität',
			categoryLabel: 'Monat',
			valueLabel: 'Sichtungen'
		});

		const texte = [...container.querySelectorAll('svg text')].map((t) => t.textContent?.trim());
		expect(texte.filter((t) => t === '100')).toHaveLength(1);
	});
});
