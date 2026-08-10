/**
 * Zentrale Zeitzonenverwaltung für die Ostsee-Tiere Anwendung
 *
 * Diese Datei stellt einheitliche Funktionen für die Formatierung von Datum und Zeit bereit,
 * mit korrekter Zeitzonenbehandlung für Deutschland/Berlin. Alle UTC-Zeiten aus der Datenbank
 * werden automatisch in die lokale Zeitzone konvertiert.
 *
 * Wichtige Konzepte:
 * - Datenbank speichert immer in UTC (korrekt)
 * - Anzeige erfolgt immer in lokaler Zeit (Europe/Berlin)
 * - Automatische Berücksichtigung von Sommer-/Winterzeit
 * - Einheitliche Formatierung für alle Komponenten
 */

/**
 * Zeitzone für die Anwendung (Deutschland/Berlin)
 * Berücksichtigt automatisch Sommer-/Winterzeit (CEST/CET)
 */
const APP_TIMEZONE = 'Europe/Berlin';

/**
 * Standard-Locale für deutsche Formatierung
 */
const APP_LOCALE = 'de-DE';

/**
 * Formatiert eine UTC-Datenbank-Zeit für die lokale Anzeige in Deutschland.
 *
 * Diese Hauptfunktion konvertiert UTC-Zeiten aus der Datenbank automatisch
 * in die deutsche Zeitzone und formatiert sie benutzerfreundlich.
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank (ISO String oder Date)
 * @param format - Gewünschtes Anzeigeformat
 * @returns Lokalisierte Zeitangabe in deutscher Formatierung
 *
 * @example
 * ```typescript
 * // UTC-Zeit aus DB: "2024-01-15T08:57:00.000Z"
 * formatLocalDateTime(utcTime, 'datetime')
 * // Ausgabe: "15.01.2024, 10:57" (in Winter) oder "15.01.2024, 09:57" (in Sommer)
 *
 * formatLocalDateTime(utcTime, 'date')
 * // Ausgabe: "15.01.2024"
 *
 * formatLocalDateTime(utcTime, 'time')
 * // Ausgabe: "10:57"
 * ```
 *
 * Die `locale` steuert **nur** die Darstellung. Die Zeitzone bleibt fest auf
 * `Europe/Berlin`, weil der Sichtungstag fachlich Berliner Ortszeit ist.
 *
 * Ausdrücklich NICHT an die Locale zu koppeln, auch wenn sie beim Aufräumen der
 * `de-DE`-Fundstellen danach aussehen:
 *   - `berlinCalendarDayIso()` unten und `berlinToday()` im Sichtungsschema
 *     benutzen `sv-SE` für ISO-Reihenfolge — Rechnung, keine Darstellung.
 *   - `formatForExport`, `formatForKmlExport`, `formatForXmlExport` bedienen
 *     Datenformate mit festem Vertrag (Entwurf, Abschnitt 6).
 *   - `splitDateTime` unten übergibt `'sv-SE'` explizit als dritten Parameter
 *     an genau diese Funktion — der naheliegendste Treffer für einen
 *     mechanischen Sweep „aktive Locale durchreichen". Das Ergebnis füllt
 *     `<input type="date">`/`<input type="time">` im Formular; eine andere
 *     Locale dort liefert z. B. "16/07/2026" statt "2026-07-16" und das
 *     Eingabefeld akzeptiert den Wert nicht mehr.
 *   - `formatISOLikeDatetime` weiter unten hat dieselbe Berechnungsrolle wie
 *     `splitDateTime`/`berlinCalendarDayIso` (zonenlose Wanduhrzeit-Strings
 *     durchreichen bzw. `sv-SE`-Reihenfolge erzeugen) und gehört aus demselben
 *     Grund nicht an die aktive Locale gekoppelt.
 */
export function formatLocalDateTime(
	utcDateTime: string | Date | null | undefined,
	format: 'full' | 'date' | 'time' | 'datetime' = 'datetime',
	locale: string = APP_LOCALE
): string {
	if (!utcDateTime) return 'Nicht angegeben';

	const date = new Date(utcDateTime);

	// Validierung: Prüfe auf ungültige Daten
	if (isNaN(date.getTime())) {
		return 'Ungültiges Datum';
	}

	const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
		full: {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZone: APP_TIMEZONE
		},
		date: {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: APP_TIMEZONE
		},
		time: {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: APP_TIMEZONE
		},
		datetime: {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: APP_TIMEZONE
		}
	};

	return date.toLocaleString(locale, formatOptions[format]);
}

/**
 * Formatiert speziell für KML-Export (Legacy-kompatibel).
 *
 * Erstellt das Format "DD.MM.YY HH:MM" wie im ursprünglichen KML-Export,
 * aber mit korrekter Zeitzonenkonvertierung.
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank
 * @returns Formatierter String im KML-Legacy-Format
 *
 * @example
 * ```typescript
 * formatForKmlExport("2024-01-15T08:57:00.000Z")
 * // Ausgabe: "15.01.24 10:57"
 * ```
 */
export function formatForKmlExport(utcDateTime: string | Date): string {
	const date = new Date(utcDateTime);

	// Validierung: Prüfe auf ungültige Daten
	if (isNaN(date.getTime())) {
		return 'Ungültiges Datum';
	}

	// Verwende toLocaleString mit Zeitzone-Option für korrekte Konvertierung
	const germanTime = date.toLocaleString(APP_LOCALE, {
		timeZone: APP_TIMEZONE,
		year: '2-digit',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	// Format: "DD.MM.YY, HH:MM" -> "DD.MM.YY HH:MM"
	return germanTime.replace(',', '');
}

/**
 * Formatiert speziell für XML-Export (Legacy-kompatibel).
 *
 * Erstellt separate Datum- und Zeit-Strings für XML-Export:
 * - Datum im Format "DD.MM.YY"
 * - Zeit im Format "HHMM" (ohne Doppelpunkt)
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank
 * @returns Objekt mit separaten Datum- und Zeit-Strings
 *
 * @example
 * ```typescript
 * formatForXmlExport("2024-01-15T08:57:00.000Z")
 * // Ausgabe: { date: "15.01.24", time: "1057" }
 * ```
 */
export function formatForXmlExport(utcDateTime: string | Date): {
	date: string;
	time: string;
} {
	const date = new Date(utcDateTime);

	// Validierung: Prüfe auf ungültige Daten
	if (isNaN(date.getTime())) {
		return { date: 'Ungültiges Datum', time: 'Ungültige Zeit' };
	}

	// Konvertiere zu deutscher Zeit mit separaten Formatierungen
	const dateString = date.toLocaleDateString(APP_LOCALE, {
		timeZone: APP_TIMEZONE,
		year: '2-digit',
		month: '2-digit',
		day: '2-digit'
	});

	const timeString = date.toLocaleTimeString(APP_LOCALE, {
		timeZone: APP_TIMEZONE,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	// Entferne Doppelpunkt aus Zeit für XML-Format
	const xmlTime = timeString.replace(':', '');

	return {
		date: dateString,
		time: xmlTime
	};
}

/**
 * Kombiniert ein Datum und eine Uhrzeit zu einem vollständigen Date-Objekt.
 *
 * NUR SERVERSEITIG verwenden, gepaart mit `correctCestOffsetUTC`: Das Datum
 * wird als UTC-Mitternacht geparst, `setHours` arbeitet aber in der
 * Laufzeit-Zeitzone — nur unter dem gepinnten `TZ=UTC` des Servers ergibt das
 * die Wanduhrzeit als UTC-Instant, den `correctCestOffsetUTC` anschließend
 * Berlin→UTC verschiebt. Im Browser hinge das Ergebnis an der Gerätezone
 * (westlich von UTC kippt sogar der Kalendertag) — Formulare übertragen
 * deshalb Datum und Uhrzeit als Strings und kombinieren erst auf dem Server.
 *
 * @param localDate - Das lokale Datum im Format "YYYY-MM-DD"
 * @param localTime - Die lokale Uhrzeit im Format "HH:MM" (optional)
 * @returns Das kombinierte Date-Objekt oder das aktuelle Datum, wenn die Eingabe ungültig ist
 */
export function combineToDate(localDate: string, localTime?: string | undefined | null): Date {
	// Validierung der Eingabe
	if (!localDate) {
		return new Date();
	}

	const fullDateTime = new Date(localDate);

	if (localTime && localTime.match(/^\d{2}:\d{2}$/)) {
		const [hours, minutes] = localTime.split(':').map(Number);
		fullDateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0); // Sekunden und MS auf 0
	}

	return fullDateTime;
}

/**
 * Formatiert Datum/Zeit für verschiedene Export-Formate.
 *
 * Zentrale Funktion für alle Export-Typen mit einheitlicher Zeitzonenbehandlung.
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank
 * @param exportType - Typ des Exports
 * @returns Formatierter String je nach Export-Typ
 */
export function formatForExport(
	utcDateTime: string | Date,
	exportType: 'csv' | 'json' | 'kml' | 'xml-date' | 'xml-time'
): string {
	switch (exportType) {
		case 'csv':
		case 'json':
			return formatLocalDateTime(utcDateTime, 'datetime');
		case 'kml':
			return formatForKmlExport(utcDateTime);
		case 'xml-date':
			return formatForXmlExport(utcDateTime).date;
		case 'xml-time':
			return formatForXmlExport(utcDateTime).time;
		default:
			return formatLocalDateTime(utcDateTime, 'datetime');
	}
}

/**
 * Hilfsfunktion: Prüft ob ein Datum gültig ist.
 *
 * @param date - Zu prüfendes Datum
 * @returns true wenn das Datum gültig ist
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
	if (!date) return false;
	const d = new Date(date);
	return !isNaN(d.getTime());
}

/**
 * Formatiert Datum/Zeit als "YYYY-MM-DD HH:MM" (Wetterzeitstempel, API-Antworten).
 *
 * Zonenlose Strings (z. B. Open-Meteo-`hourly.time` mit `timezone=Europe/Berlin`)
 * sind bereits Berlin-Wanduhrzeit und werden nur umformatiert — ohne den Umweg
 * über ein Date-Objekt, der das Ergebnis an die Laufzeit-Zeitzone binden würde.
 * Echte Instants (Date-Objekte, ISO-Strings mit Zonenangabe) werden explizit
 * nach Europe/Berlin konvertiert.
 *
 * @param dateTime - Date-Objekt oder Datums-/Zeit-String
 * @returns Formatiertes Datum als "YYYY-MM-DD HH:MM", leer bei ungültiger Eingabe
 */
export function formatISOLikeDatetime(dateTime: string | Date | null | undefined): string {
	if (!dateTime) return '';

	if (typeof dateTime === 'string') {
		const wanduhrzeit = dateTime.match(
			/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/
		);
		if (wanduhrzeit) {
			return `${wanduhrzeit[1]} ${wanduhrzeit[2]}`;
		}
	}

	const date = new Date(dateTime);
	if (isNaN(date.getTime())) return '';

	return date.toLocaleString('sv-SE', {
		timeZone: APP_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Formatiert einen Beobachtungszeitstempel für die Anzeige: "DD.MM.YYYY, HH:MM".
 *
 * Für zonenlose Berlin-Wanduhrzeit-Strings (z. B. `observation_time` aus
 * `weatherService.ts`, geliefert von Open-Meteo mit `timezone=Europe/Berlin`):
 * `formatLocalDateTime` würde sie fälschlich ein zweites Mal nach Berlin
 * konvertieren — hier werden sie über `formatISOLikeDatetime` nur umsortiert,
 * ohne Umweg über ein Date-Objekt (bliebe sonst an der Laufzeit-Zone hängen).
 * Echte Instants (Date, ISO mit Zonenangabe) werden nach Europe/Berlin
 * konvertiert.
 *
 * @param time - Zonenloser Wanduhrzeit-String, Instant-String oder Date
 * @returns "DD.MM.YYYY, HH:MM", leer bei fehlender oder ungültiger Eingabe
 */
export function formatObservationTime(time: string | Date | null | undefined): string {
	const iso = formatISOLikeDatetime(time);
	if (!iso) return '';
	const [datePart, timePart] = iso.split(' ');
	const [year, month, day] = (datePart ?? '').split('-');
	return `${day}.${month}.${year}, ${timePart}`;
}

/**
 * Berliner Kalendertag eines Zeitpunkts als "YYYY-MM-DD".
 *
 * Für „Heute"-Vergleiche mit Kalendertag-Strings aus Formularen und APIs:
 * in den 1–2 Stunden nach Mitternacht Berlin hat UTC den Tageswechsel noch
 * nicht vollzogen — ein `toISOString()`-Schnitt läge dann einen Tag daneben.
 *
 * @param instant - Zeitpunkt, Standard: jetzt
 */
export function berlinCalendarDayIso(instant: Date = new Date()): string {
	return instant.toLocaleDateString('sv-SE', { timeZone: APP_TIMEZONE });
}

/**
 * Hilfsfunktion: Formatiert ein Datum/Zeit-Objekt in einer bestimmten
 * Format zur Nutzung in Eingabefeldern
 *
 * @param date - Datum/Zeit-Objekt
 * @param format - Format der Ausgabe
 * @returns Formatiertes Datum/Zeit-Objekt als String
 */
export function splitDateTime(dateTime: string | Date): { date: string; time: string } {
	const date = formatLocalDateTime(dateTime, 'date', 'sv-SE');
	const time = formatLocalDateTime(dateTime, 'time', 'sv-SE');
	return { date, time };
}
