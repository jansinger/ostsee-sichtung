import type { SichtungenMap } from './optimizedMapController';

/**
 * Time Slider Manager für die Zeitfilterung
 */

export interface TimeSliderManager {
	initialize(mapInstance: SichtungenMap): void;
	reset(daysInYear: number): void;
}

export class MapTimeSliderManager implements TimeSliderManager {
	private mapInstance?: SichtungenMap;

	/**
	 * Initialisiert den Dual-Range-Slider für die Zeitfilterung
	 */
	initialize(mapInstance: SichtungenMap): void {
		this.mapInstance = mapInstance;

		const startSlider = document.getElementById('time-range-start') as HTMLInputElement;
		const endSlider = document.getElementById('time-range-end') as HTMLInputElement;

		if (!startSlider || !endSlider || !this.mapInstance) return;

		// Event-Handler für Start-Slider
		startSlider.addEventListener('input', () => {
			const startValue = parseInt(startSlider.value, 10);
			const endValue = parseInt(endSlider.value, 10);

			// Klemmen statt Verschieben: Start darf gleich Ende sein (ein einzelner
			// Tag als Zeitraum), aber nicht darüber hinaus.
			if (startValue > endValue) {
				startSlider.value = endValue.toString();
			}

			this.updateTimeFilter(startSlider, endSlider);
		});

		// Event-Handler für End-Slider
		endSlider.addEventListener('input', () => {
			const startValue = parseInt(startSlider.value, 10);
			const endValue = parseInt(endSlider.value, 10);

			// Klemmen statt Verschieben: Ende darf gleich Start sein.
			if (endValue < startValue) {
				endSlider.value = startValue.toString();
			}

			this.updateTimeFilter(startSlider, endSlider);
		});
	}

	/**
	 * Setzt beide Slider auf den vollen Jahresbereich zurück (0 bis
	 * `daysInYear - 1`) und aktualisiert deren `max`-Attribut.
	 *
	 * QW4: Bei einem Jahreswechsel bleiben die Slider-Werte sonst auf der
	 * zuvor gewählten Position (z. B. Juli) stehen, während der Controller den
	 * Datenfilter bereits auf das volle neue Jahr zurücksetzt — sichtbarer
	 * Widerspruch zwischen Slider-Stellung und tatsächlich gefilterten Daten.
	 * Reine DOM-Aktualisierung; den Datenfilter selbst setzt `setYear()` im
	 * Controller bereits korrekt auf das volle Jahr.
	 */
	reset(daysInYear: number): void {
		const startSlider = document.getElementById('time-range-start') as HTMLInputElement | null;
		const endSlider = document.getElementById('time-range-end') as HTMLInputElement | null;

		if (!startSlider || !endSlider) return;

		const maxValue = (daysInYear - 1).toString();
		startSlider.max = maxValue;
		endSlider.max = maxValue;
		startSlider.value = '0';
		endSlider.value = maxValue;

		// M10: input-Events dispatchen, damit die DualRangeSlider-Komponente
		// (Füllbereich, aria-valuetext, Datums-Eingabefelder) den neuen Zustand
		// übernimmt. Beide Werte sind zu diesem Zeitpunkt bereits konsistent
		// gesetzt — das Clamping in initialize() ist ein No-op. Der dadurch
		// ausgelöste setFilter()-Aufruf setzt denselben vollen Jahresbereich,
		// den setYear() im Controller bereits gesetzt hat.
		startSlider.dispatchEvent(new Event('input', { bubbles: true }));
		endSlider.dispatchEvent(new Event('input', { bubbles: true }));
	}

	/**
	 * Aktualisiert den Zeitfilter basierend auf den Slider-Werten
	 */
	private updateTimeFilter(startSlider: HTMLInputElement, endSlider: HTMLInputElement): void {
		if (!this.mapInstance) return;

		const currentYear = new Date().getFullYear();
		const yearToUse = this.mapInstance.getDisplayedYear() || currentYear;

		const startDay = parseInt(startSlider.value, 10);
		const endDay = parseInt(endSlider.value, 10);

		// Berechne Timestamps für Start und Ende
		const startDate = new Date(yearToUse, 0, 1);
		startDate.setDate(startDate.getDate() + startDay);

		const endDate = new Date(yearToUse, 0, 1);
		endDate.setDate(endDate.getDate() + endDay);
		endDate.setHours(23, 59, 59, 999); // Ende des Tages

		// Setze den Filter in der Karte
		this.mapInstance.setFilter(startDate.getTime(), endDate.getTime());
	}
}
