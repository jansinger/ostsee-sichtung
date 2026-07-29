import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import FilterPanel from './FilterPanel.svelte';

const YEARS = [2023, 2024, 2025];

function getFilterPanel(): HTMLElement {
	const panel = document.querySelector('#filter-panel');
	if (!(panel instanceof HTMLElement)) {
		throw new Error('Filter panel not found');
	}
	return panel;
}

function getToggleButton(): HTMLButtonElement {
	const button = document.querySelector('button[aria-controls="filter-panel"]');
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error('Filter toggle button not found');
	}
	return button;
}

function getCloseButton(): HTMLButtonElement {
	const button = document.querySelector('#filter-panel [aria-label="Filter schließen"]');
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
	it('öffnet und schließt das Panel über die Buttons (inert im geschlossenen Zustand)', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		const panel = getFilterPanel();

		// H5: Geschlossenes Panel ist inert — kein Element im Tab-Zyklus
		expect(panel.inert).toBe(true);

		await page.getByRole('button', { name: /^Filter$/i }).click();
		await vi.waitFor(() => {
			expect(panel.inert).toBe(false);
		});

		getCloseButton().click();
		await vi.waitFor(() => {
			expect(panel.inert).toBe(true);
		});
	});

	it('Toggle-Button trägt aria-expanded und aria-controls (H5)', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		const toggle = getToggleButton();
		expect(toggle.getAttribute('aria-expanded')).toBe('false');

		await page.getByRole('button', { name: /^Filter$/i }).click();
		await vi.waitFor(() => {
			expect(toggle.getAttribute('aria-expanded')).toBe('true');
		});
	});

	it('Elemente im geschlossenen Panel sind nicht fokussierbar (WCAG 4.1.2)', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		const yearSelect = getYearSelect();
		yearSelect.focus();
		expect(document.activeElement).not.toBe(yearSelect);
	});

	it('beim Öffnen wandert der Fokus auf die Panel-Überschrift, beim Schließen zurück zum Toggle', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		await page.getByRole('button', { name: /^Filter$/i }).click();
		const heading = document.querySelector('#filter-title');
		await vi.waitFor(() => {
			expect(document.activeElement).toBe(heading);
		});

		await page.getByRole('button', { name: 'Filter schließen' }).click();
		await vi.waitFor(() => {
			expect(document.activeElement).toBe(getToggleButton());
		});
	});

	it('behält Suchtext beim Schließen und erneuten Öffnen', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		await page.getByRole('button', { name: /^Filter$/i }).click();
		const searchInput = getSearchInput();
		searchInput.value = 'Seehund';
		searchInput.dispatchEvent(new Event('input', { bubbles: true }));

		getCloseButton().click();
		await page.getByRole('button', { name: /^Filter$/i }).click();

		await vi.waitFor(() => {
			expect(getSearchInput().value).toBe('Seehund');
		});
	});

	it('zeigt Jahresoptionen und korrekte ARIA-Attribute (region statt dialog)', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		await page.getByRole('button', { name: /^Filter$/i }).click();

		// H5: Nicht-modales Seitenpanel — role="region", kein aria-modal
		const panel = getFilterPanel();
		expect(panel.getAttribute('role')).toBe('region');
		expect(panel.hasAttribute('aria-modal')).toBe(false);
		expect(panel.getAttribute('aria-labelledby')).toBe('filter-title');

		const options = getYearSelect().querySelectorAll('option');
		expect(options.length).toBe(3);
	});

	it('passt Slider-Maximum bei Schaltjahr an', async () => {
		render(FilterPanel, { years: YEARS, defaultYear: 2025 });

		await page.getByRole('button', { name: /^Filter$/i }).click();
		const yearSelect = getYearSelect();
		yearSelect.value = '2024';
		yearSelect.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(getSlider('time-range-start').getAttribute('max')).toBe('365');
			expect(getSlider('time-range-end').getAttribute('max')).toBe('365');
		});
	});
});
