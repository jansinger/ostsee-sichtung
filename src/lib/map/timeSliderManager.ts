import type { SichtungenMap } from './optimizedMapController';

/**
 * Time Slider Manager für die Zeitfilterung
 */

export interface TimeSliderManager {
	initialize(mapInstance: SichtungenMap): void;
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
			const startValue = parseInt(startSlider.value);
			const endValue = parseInt(endSlider.value);

			// Stelle sicher, dass Start nicht größer als End ist
			if (startValue >= endValue) {
				startSlider.value = (endValue - 1).toString();
			}

			this.updateTimeFilter(startSlider, endSlider);
		});

		// Event-Handler für End-Slider
		endSlider.addEventListener('input', () => {
			const startValue = parseInt(startSlider.value);
			const endValue = parseInt(endSlider.value);

			// Stelle sicher, dass End nicht kleiner als Start ist
			if (endValue <= startValue) {
				endSlider.value = (startValue + 1).toString();
			}

			this.updateTimeFilter(startSlider, endSlider);
		});
	}

	/**
	 * Aktualisiert den Zeitfilter basierend auf den Slider-Werten
	 */
	private updateTimeFilter(startSlider: HTMLInputElement, endSlider: HTMLInputElement): void {
		if (!this.mapInstance) return;

		const currentYear = new Date().getFullYear();
		const yearToUse = this.mapInstance.getDisplayedYear() || currentYear;

		const startDay = parseInt(startSlider.value);
		const endDay = parseInt(endSlider.value);

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
