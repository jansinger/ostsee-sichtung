import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { CountData } from '$lib/map/countManager';
import LegendPanel from './LegendPanel.svelte';

const mockCountManager = {
	setSpeciesVisibility: vi.fn(),
	setColorVisibility: vi.fn()
};

vi.mock('$lib/map/mapContext', () => ({
	getMapCountManager: () => mockCountManager
}));

const translations = {
	species_legend: 'Arten',
	count: 'Anzahl',
	found_dead: 'Totfund',
	speciesMap: {
		'0': 'Schweinswal',
		'1': 'Kegelrobbe',
		'2': 'Seehund'
	}
};

const counts: CountData = {
	speciesCounts: {
		'0': { visible: 3, total: 5 },
		'1': { visible: 1, total: 2 },
		'2': { visible: 0, total: 1 }
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

		expect(document.querySelectorAll('.species-checkbox')).toHaveLength(3);
		expect(document.querySelectorAll('.color-checkbox')).toHaveLength(6);
		expect(document.body.textContent).toContain('Schweinswal');
		expect(document.body.textContent).toContain('3/5');
		expect(document.body.textContent).toContain('Totfund');
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
