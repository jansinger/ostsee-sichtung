/**
 * Standortbestimmung für den Button „Mein aktueller Standort".
 *
 * Bewusst als reines Modul mit injizierter `Geolocation`-Instanz: Der Fehlerpfad
 * (Freigabe verweigert, kein HTTPS, Zeitüberschreitung) ist der wichtigste Teil
 * und lässt sich so in Node testen, ohne einen Browser zu starten.
 */

export type GeolocationOutcome =
	{ ok: true; latitude: number; longitude: number } | { ok: false; message: string };

/** Übersetzt die numerischen Codes der Geolocation-API in verständliche Sätze. */
export function describeGeolocationError(error: { code: number }): string {
	switch (error.code) {
		case 1:
			return 'Der Standort wurde nicht freigegeben. Sie können die Position stattdessen auf der Karte wählen.';
		case 2:
			return 'Der Standort konnte nicht ermittelt werden. Bitte wählen Sie die Position auf der Karte.';
		case 3:
			return 'Die Standortbestimmung hat zu lange gedauert. Bitte versuchen Sie es erneut oder wählen Sie die Position auf der Karte.';
		default:
			return 'Der Standort ließ sich nicht abrufen. Bitte wählen Sie die Position auf der Karte.';
	}
}

/**
 * Fragt den Gerätestandort ab und liefert immer ein aufgelöstes Ergebnis —
 * nie eine abgelehnte Promise. Der Aufrufer muss also keinen catch-Pfad bauen.
 */
export function requestCurrentPosition(
	geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined
): Promise<GeolocationOutcome> {
	if (!geolocation) {
		return Promise.resolve({
			ok: false,
			message: 'Dieser Browser unterstützt keine Standortbestimmung.'
		});
	}

	return new Promise((resolve) => {
		geolocation.getCurrentPosition(
			(position) =>
				resolve({
					ok: true,
					latitude: position.coords.latitude,
					longitude: position.coords.longitude
				}),
			(error) => resolve({ ok: false, message: describeGeolocationError(error) }),
			{ enableHighAccuracy: true, timeout: 10_000 }
		);
	});
}
