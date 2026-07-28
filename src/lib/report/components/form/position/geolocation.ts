/**
 * Standortbestimmung für den Button „Mein aktueller Standort".
 *
 * Bewusst als reines Modul mit injizierter `Geolocation`-Instanz: Der Fehlerpfad
 * (Freigabe verweigert, kein HTTPS, Zeitüberschreitung) ist der wichtigste Teil
 * und lässt sich so in Node testen, ohne einen Browser zu starten.
 */

export type GeolocationOutcome =
	{ ok: true; latitude: number; longitude: number } | { ok: false; message: string };

/**
 * Zeitbudget, das die Geolocation-API selbst bekommt (`timeout`-Option). Es läuft
 * laut Spezifikation erst ab dem Moment, in dem der Nutzer den
 * Berechtigungsdialog beantwortet hat.
 */
export const GEOLOCATION_TIMEOUT_MS = 10_000;

/**
 * Frist des eigenen Wächters. Bewusst eine eigene Konstante und deutlich größer
 * als `GEOLOCATION_TIMEOUT_MS`:
 *
 * Die beiden Uhren starten zu verschiedenen Zeitpunkten — die API-Frist erst nach
 * der Antwort auf den Dialog, der Wächter schon beim Aufruf. Wer beide gleich
 * setzt, erklärt einen Erstnutzer, der ein paar Sekunden zum Lesen und Tippen
 * braucht und danach auf einen kalten GPS-Fix wartet, für gescheitert — obwohl
 * seine Position gleich eintrifft und der `settled`-Wächter sie dann verwirft.
 *
 * 30 s = API-Frist (10 s) + reichlich Spielraum für den Dialog. Der Wächter ist
 * ausschließlich für den Fall da, dass der Dialog NIE beantwortet wird und
 * deshalb überhaupt kein Callback kommt; er ist keine zweite Zeitmessung für die
 * Ortung selbst.
 */
export const GEOLOCATION_WATCHDOG_MS = 30_000;

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
 *
 * Der eigene Zeitwächter ist kein Gürtel-und-Hosenträger: Die `timeout`-Option
 * der Geolocation-API startet laut Spezifikation erst, nachdem der Nutzer den
 * Berechtigungsdialog beantwortet hat. Wer den Dialog offen liegen lässt, bekommt
 * weder Erfolgs- noch Fehler-Callback — ohne Wächter bliebe die Promise für
 * immer offen und der Ladezustand im Aufrufer hängen.
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
		let settled = false;
		// Der Wächter wird vor `getCurrentPosition` gestartet, damit `finish` ihn
		// auch bei einem synchron aufgerufenen Callback bereits abräumen kann.
		const watchdog = setTimeout(
			() => finish({ ok: false, message: describeGeolocationError({ code: 3 }) }),
			GEOLOCATION_WATCHDOG_MS
		);

		function finish(outcome: GeolocationOutcome): void {
			if (settled) return;
			settled = true;
			clearTimeout(watchdog);
			resolve(outcome);
		}

		geolocation.getCurrentPosition(
			(position) =>
				finish({
					ok: true,
					latitude: position.coords.latitude,
					longitude: position.coords.longitude
				}),
			(error) => finish({ ok: false, message: describeGeolocationError(error) }),
			{ enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS }
		);
	});
}
