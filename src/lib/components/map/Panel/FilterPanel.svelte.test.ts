import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import FilterPanel from './FilterPanel.svelte';

const YEARS = [2023, 2024, 2025];

function getFilterPanel(): HTMLElement {
	const panel = document.querySelector('[aria-labelledby="filter-title"]');
	if (!(panel instanceof HTMLElement)) {
		throw new Error('Filter panel not found');
	}
	return panel;
}

function getCloseButton(): HTMLButtonElement {
	const button = document.querySelector(
		'[aria-labelledby="filter-title"] [aria-label="Filter schließen"]'
	);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error('Filter close button not found');
	}
	return button;
}

function getYearSelect(): HTMLSelectElement {
	const select = document.querySelector('#year-select');
	if (!(select instanceof HTMLSelectElement)) {
		throw new Error('Year select not found');
	}
	return select;
}

function getSearchInput(): HTMLInputElement {
	const input = document.querySelector('#filter-input');
	if (!(input instanceof HTMLInputElement)) {
		throw new Error('Search input not found');
	}
	return input;
}

function getSlider(id: string): HTMLInputElement {
	const slider = document.querySelector(`#${id}`);
	if (!(slider instanceof HTMLInputElement)) {
		throw new Error(`Slider ${id} not found`);
	}
	return slider;
}

describe('FilterPanel', () => {
	it('öffnet und schließt das Panel über die Buttons', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		const toggleButton = page.getByRole('button', { name: /Filter öffnen/i });
		const panel = getFilterPanel();

		expect(panel.getAttribute('aria-hidden')).toBe('true');
		await toggleButton.click();
		await vi.waitFor(() => {
			expect(panel.getAttribute('aria-hidden')).toBe('false');
		});

		getCloseButton().click();
		await vi.waitFor(() => {
			expect(panel.getAttribute('aria-hidden')).toBe('true');
		});
	});

	it('behält Suchtext beim Schließen und erneuten Öffnen', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		await page.getByRole('button', { name: /Filter öffnen/i }).click();
		const searchInput = getSearchInput();
		searchInput.value = 'Seehund';
		searchInput.dispatchEvent(new Event('input', { bubbles: true }));

		getCloseButton().click();
		await page.getByRole('button', { name: /Filter öffnen/i }).click();

		await vi.waitFor(() => {
			expect(getSearchInput().value).toBe('Seehund');
		});
	});

	it('zeigt Jahresoptionen und korrekte ARIA-Attribute', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		await page.getByRole('button', { name: /Filter öffnen/i }).click();

		const panel = getFilterPanel();
		expect(panel.getAttribute('aria-modal')).toBe('true');
		expect(panel.getAttribute('aria-labelledby')).toBe('filter-title');

		const options = getYearSelect().querySelectorAll('option');
		expect(options.length).toBe(3);
	});

	it('passt Slider-Maximum bei Schaltjahr an', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		await page.getByRole('button', { name: /Filter öffnen/i }).click();
		const yearSelect = getYearSelect();
		yearSelect.value = '2024';
		yearSelect.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(getSlider('time-range-start').getAttribute('max')).toBe('365');
			expect(getSlider('time-range-end').getAttribute('max')).toBe('365');
		});
	});
});