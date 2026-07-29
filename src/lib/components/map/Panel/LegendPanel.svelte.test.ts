import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { CountData } from '$lib/map/countManager';
import type { MapTranslations } from '$lib/map/mapUtils';
import LegendPanel from './LegendPanel.svelte';

const mockCountManager = {
	setSpeciesVisibility: vi.fn(),
	setColorVisibility: vi.fn()
};

vi.mock('$lib/map/mapContext', () => ({
	getMapCountManager: () => mockCountManager
}));

const translations: MapTranslations = {
	overview: 'Uebersicht',
	zoom_title: 'Zoom',
	zoom: 'Zoom',
	report_date: 'Meldedatum',
	language: 'Sprache',
	species: 'Tierart',
	species_legend: 'Arten',
	position: 'Position',
	count: 'Anzahl',
	young: 'Jungtiere',
	ship: 'Schiff',
	name: 'Name',
	area: 'Gebiet',
	latitude: 'Breitengrad',
	longitude: 'Laengengrad',
	found_dead: 'Totfund',
	speciesMap: {
		'0': 'Schweinswal',
		'1': 'Kegelrobbe',
		'2': 'Seehund',
		'8': 'Unbekannte Walart'
	}
};

const counts: CountData = {
	speciesCounts: {
		'0': { visible: 3, total: 5 },
		'1': { visible: 1, total: 2 },
		'2': { visible: 0, total: 1 },
		'8': { visible: 0, total: 0 }
	},
	colorCounts: {
		ct0: 1,
		ct1: 3,
		ct2: 2,
		ct6: 1,
		ct11: 0,
		ct15: 4
	}
};

function getLegendPanel(): HTMLElement {
	const panel = document.querySelector('[aria-labelledby="legend-title"]');
	if (!(panel instanceof HTMLElement)) {
		throw new Error('Legend panel not found');
	}
	return panel;
}

function getCloseButton(): HTMLButtonElement {
	const button = document.querySelector(
		'[aria-labelledby="legend-title"] [aria-label="Legende schließen"]'
	);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error('Legend close button not found');
	}
	return button;
}

function getSpeciesCheckbox(value: string): HTMLInputElement {
	const checkbox = document.querySelector(`.species-checkbox[value="${value}"]`);
	if (!(checkbox instanceof HTMLInputElement)) {
		throw new Error(`Species checkbox ${value} not found`);
	}
	return checkbox;
}

function getColorCheckbox(value: string): HTMLInputElement {
	const checkbox = document.querySelector(`.color-checkbox[value="${value}"]`);
	if (!(checkbox instanceof HTMLInputElement)) {
		throw new Error(`Color checkbox ${value} not found`);
	}
	return checkbox;
}

describe('LegendPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('öffnet und schließt das Panel über die Buttons', async () => {
		render(LegendPanel, { translations, counts });

		const panel = getLegendPanel();
		expect(panel.getAttribute('aria-hidden')).toBe('true');

		await page.getByRole('button', { name: /Legende öffnen/i }).click();
		await vi.waitFor(() => {
			expect(panel.getAttribute('aria-hidden')).toBe('false');
		});

		getCloseButton().click();
		await vi.waitFor(() => {
			expect(panel.getAttribute('aria-hidden')).toBe('true');
		});
	});

	it('rendert Arten-, Farbgruppen- und Zählerdaten', async () => {
		render(LegendPanel, { translations, counts });

		await page.getByRole('button', { name: /Legende öffnen/i }).click();

		const panel = getLegendPanel();
		expect(panel.getAttribute('aria-modal')).toBe('true');
		expect(panel.getAttribute('aria-labelledby')).toBe('legend-title');

		expect(document.querySelectorAll('.species-checkbox')).toHaveLength(4);
		expect(document.querySelectorAll('.color-checkbox')).toHaveLength(6);
		expect(document.body.textContent).toContain('Schweinswal');
		expect(document.body.textContent).toContain('3/5');
		expect(document.body.textContent).toContain('Totfund');
	});

	it('zeigt Gruppen-Badges aus den styleUtils-Konstanten (Kegelrobbe → Robbe)', async () => {
		render(LegendPanel, { translations, counts });

		await page.getByRole('button', { name: /Legende öffnen/i }).click();

		const sealRow = document.querySelector('[data-species-row="1"]');
		expect(sealRow?.textContent).toContain('Robbe');
	});

	it('weist Unbekannte Walart nicht als Großwal aus (M8)', async () => {
		render(LegendPanel, { translations, counts });

		await page.getByRole('button', { name: /Legende öffnen/i }).click();

		const unknownRow = document.querySelector('[data-species-row="8"]');
		expect(unknownRow?.textContent).not.toContain('Großwal');
		expect(unknownRow?.textContent).toContain('Art unbestimmt');
	});

	it('graut Arten ohne Sichtungen (0/0) aus, Checkbox bleibt bedienbar', async () => {
		render(LegendPanel, { translations, counts });

		await page.getByRole('button', { name: /Legende öffnen/i }).click();

		const unknownRow = document.querySelector('[data-species-row="8"]');
		expect(unknownRow?.querySelector('.grayscale')).not.toBeNull();
		// Art mit Sichtungen ist nicht ausgegraut
		const porpoiseRow = document.querySelector('[data-species-row="0"]');
		expect(porpoiseRow?.querySelector('.grayscale')).toBeNull();
		// Checkbox der 0/0-Art bleibt vorhanden und aktivierbar
		expect(unknownRow?.querySelector('.species-checkbox')).not.toBeNull();
	});

	it('unbekannte Tierart-IDs bekommen den neutralen grauen Ring, nicht Totfund-Schwarz', async () => {
		render(LegendPanel, {
			translations: {
				...translations,
				speciesMap: { ...translations.speciesMap, '99': 'Zukünftige Art' }
			},
			counts
		});

		await page.getByRole('button', { name: /Legende öffnen/i }).click();

		const row = document.querySelector('[data-species-row="99"]');
		const swatch = row?.querySelector('div[style*="border"]');
		// Browser normalisiert Hex zu rgb(): #767676 = rgb(118, 118, 118)
		expect(swatch?.getAttribute('style')).toContain('rgb(118, 118, 118)');
		expect(swatch?.getAttribute('style')).not.toContain('rgb(0, 0, 0)');
	});

	it('erklärt die Cluster-Farbskala', async () => {
		render(LegendPanel, { translations, counts });

		await page.getByRole('button', { name: /Legende öffnen/i }).click();

		expect(document.body.textContent).toContain('Cluster');
		expect(document.body.textContent).toContain('je dunkler');
	});

	it('meldet Species- und Farb-Toggles an den CountManager', async () => {
		render(LegendPanel, { translations, counts });

		await page.getByRole('button', { name: /Legende öffnen/i }).click();

		const speciesCheckbox = getSpeciesCheckbox('0');
		speciesCheckbox.checked = false;
		speciesCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

		const colorCheckbox = getColorCheckbox('ct1');
		colorCheckbox.checked = false;
		colorCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

		expect(mockCountManager.setSpeciesVisibility).toHaveBeenCalledWith('0', false);
		expect(mockCountManager.setColorVisibility).toHaveBeenCalledWith('ct1', false);
	});
});
