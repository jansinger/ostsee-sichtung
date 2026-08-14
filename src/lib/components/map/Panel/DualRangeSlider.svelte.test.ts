// M10: Echter Dual-Range-Slider — ein Track, zwei Griffe, gefüllter Bereich.
// Die Komponente behält die DOM-Verträge des alten Doppel-Slider-Aufbaus:
// IDs time-range-start/time-range-end, Wert-Änderungen via value + input-Event
// (timeSliderManager, applyUrlFilters), Anzeige-Elemente #time-start/#time-end.
import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import DualRangeSlider from './DualRangeSlider.svelte';

function getRange(id: string): HTMLInputElement {
	const input = document.querySelector(`#${id}`);
	if (!(input instanceof HTMLInputElement)) {
		throw new Error(`Range input ${id} not found`);
	}
	return input;
}

function getDateInput(id: string): HTMLInputElement {
	const input = document.querySelector(`#${id}`);
	if (!(input instanceof HTMLInputElement)) {
		throw new Error(`Date input ${id} not found`);
	}
	return input;
}

/** Simuliert den externen Schreibpfad (Manager/applyUrlFilters): value + input-Event */
function setRangeValue(id: string, value: number): void {
	const input = getRange(id);
	input.value = String(value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('DualRangeSlider', () => {
	it('rendert beide Griffe mit korrekten min/max und Startwerten (volles Jahr)', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		const start = getRange('time-range-start');
		const end = getRange('time-range-end');

		expect(start.min).toBe('0');
		expect(start.max).toBe('364');
		expect(start.value).toBe('0');
		expect(end.min).toBe('0');
		expect(end.max).toBe('364');
		expect(end.value).toBe('364');
	});

	it('trägt lesbares Datum als aria-valuetext auf beiden Griffen', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		expect(getRange('time-range-start').getAttribute('aria-valuetext')).toBe('1. Januar');
		expect(getRange('time-range-end').getAttribute('aria-valuetext')).toBe('31. Dezember');
	});

	it('aktualisiert aria-valuetext live bei Wert-Änderung („186" → „6. Juli")', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		setRangeValue('time-range-start', 186);

		await vi.waitFor(() => {
			expect(getRange('time-range-start').getAttribute('aria-valuetext')).toBe('6. Juli');
		});
	});

	it('klemmt Start auf Ende, wenn Start über Ende hinausgezogen wird', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		setRangeValue('time-range-end', 100);
		setRangeValue('time-range-start', 200);

		await vi.waitFor(() => {
			expect(getRange('time-range-start').value).toBe('100');
			expect(getRange('time-range-end').value).toBe('100');
		});
	});

	it('klemmt Ende auf Start, wenn Ende unter Start gezogen wird', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		setRangeValue('time-range-start', 200);
		setRangeValue('time-range-end', 50);

		await vi.waitFor(() => {
			expect(getRange('time-range-end').value).toBe('200');
		});
	});

	it('setzt die Füll-Variablen des Tracks aus den Griff-Positionen', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		const container = document.querySelector('[data-testid="dual-range"]');
		if (!(container instanceof HTMLElement)) throw new Error('Container not found');

		expect(container.style.getPropertyValue('--range-start').trim()).toBe('0%');
		expect(container.style.getPropertyValue('--range-end').trim()).toBe('100%');

		setRangeValue('time-range-start', 91);
		await vi.waitFor(() => {
			expect(container.style.getPropertyValue('--range-start').trim()).toBe('25%');
		});
	});

	it('hält das 44-px-Touch-Target der Griff-Flächen', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		const rect = getRange('time-range-start').getBoundingClientRect();
		expect(rect.height).toBeGreaterThanOrEqual(44);
	});

	it('zeigt Datums-Eingabefelder, auf das gewählte Jahr geklemmt und synchron zum Slider', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		const startDate = getDateInput('time-date-start');
		const endDate = getDateInput('time-date-end');

		expect(startDate.min).toBe('2025-01-01');
		expect(startDate.max).toBe('2025-12-31');
		expect(endDate.min).toBe('2025-01-01');
		expect(endDate.max).toBe('2025-12-31');
		expect(startDate.value).toBe('2025-01-01');
		expect(endDate.value).toBe('2025-12-31');

		setRangeValue('time-range-start', 186);
		await vi.waitFor(() => {
			expect(getDateInput('time-date-start').value).toBe('2025-07-06');
		});
	});

	it('Datums-Eingabe setzt den Slider-Wert und feuert ein input-Event (Manager-Pfad)', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		const start = getRange('time-range-start');
		const inputEvents: string[] = [];
		start.addEventListener('input', () => inputEvents.push(start.value));

		const startDate = getDateInput('time-date-start');
		startDate.value = '2025-07-06';
		startDate.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(start.value).toBe('186');
			expect(inputEvents).toContain('186');
			expect(start.getAttribute('aria-valuetext')).toBe('6. Juli');
		});
	});

	it('verwirft ein Datum außerhalb des Jahres und stellt den alten Wert wieder her', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		const startDate = getDateInput('time-date-start');
		startDate.value = '2024-05-01';
		startDate.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(getRange('time-range-start').value).toBe('0');
			expect(getDateInput('time-date-start').value).toBe('2025-01-01');
		});
	});

	it('Datums-Eingabe über dem Ende wird auf das Ende geklemmt', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		setRangeValue('time-range-end', 100);

		const startDate = getDateInput('time-date-start');
		startDate.value = '2025-12-01';
		startDate.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(getRange('time-range-start').value).toBe('100');
		});
	});

	it('stellt das Datums-Feld auch dann zurück, wenn die Klemmung den Wert nicht ändert', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		// Start == Ende (Tag 100) — die Klemmung eines späteren Datums ergibt
		// wieder 100, der State ändert sich also nicht. Das Feld darf trotzdem
		// nicht auf dem getippten Datum stehen bleiben.
		setRangeValue('time-range-end', 100);
		setRangeValue('time-range-start', 100);

		const startDate = getDateInput('time-date-start');
		startDate.value = '2025-12-01';
		startDate.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(getRange('time-range-start').value).toBe('100');
			// Tag 100 in 2025 = 11. April
			expect(getDateInput('time-date-start').value).toBe('2025-04-11');
		});
	});

	it('enthält die Anzeige-Elemente #time-start und #time-end (Controller-Vertrag)', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		expect(document.querySelector('#time-start')).not.toBeNull();
		expect(document.querySelector('#time-end')).not.toBeNull();
	});

	it('übernimmt einen externen Reset (beide Werte + ein Event, z. B. Jahreswechsel QW4)', async () => {
		await render(DualRangeSlider, { max: 364, year: 2025 });

		setRangeValue('time-range-start', 100);
		setRangeValue('time-range-end', 200);

		// timeSliderManager.reset(): max/value direkt setzen, dann EIN Event —
		// die Handler lesen beide Slider, ein Event synct den ganzen State.
		const start = getRange('time-range-start');
		const end = getRange('time-range-end');
		start.max = '365';
		end.max = '365';
		start.value = '0';
		end.value = '365';
		start.dispatchEvent(new Event('input', { bubbles: true }));

		await vi.waitFor(() => {
			expect(getRange('time-range-start').value).toBe('0');
			expect(getRange('time-range-end').value).toBe('365');
			expect(getRange('time-range-start').getAttribute('aria-valuetext')).toBe('1. Januar');
		});
	});
});
