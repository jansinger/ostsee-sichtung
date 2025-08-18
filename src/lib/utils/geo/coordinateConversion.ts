/**
 * @fileoverview Koordinaten-Konvertierungsfunktionen für GPS-Daten
 * 
 * Dieses Modul enthält Funktionen zur Umwandlung zwischen verschiedenen
 * Koordinatenformaten, die in der Seefahrt und GPS-Navigation verwendet werden:
 * 
 * - DD (Decimal Degrees): 54.51°
 * - DMS (Degrees Minutes Seconds): 54°30'36"
 * - DM (Degrees Minutes): 54°30.6'
 * 
 * Alle Funktionen sind für die Verwendung mit Ostsee-Koordinaten optimiert
 * und bieten eine Genauigkeit von ~11m durch 4 Nachkommastellen.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

/**
 * Konvertiert Grad, Minuten und Sekunden (DMS) in Dezimalgrad (DD)
 * 
 * Diese Funktion wird für die Umwandlung von GPS-Koordinaten verwendet,
 * die oft in DMS-Format (z.B. 54°30'36"N) vorliegen.
 * 
 * @param deg Grad (0-180 für Breitengrad, 0-90 für Längengrad)
 * @param min Minuten (0-59)
 * @param sec Sekunden (0-59.999...)
 * @param sign Vorzeichen (1 für N/E, -1 für S/W)
 * @returns Dezimalgrad auf 4 Nachkommastellen gerundet
 * 
 * @example
 * // Konvertiert 54°30'36"N zu 54.51°
 * const lat = dmsToDd(54, 30, 36, 1);
 * console.log(lat); // 54.51
 */
export function dmsToDd(deg: number, min: number, sec: number, sign: 1 | -1): number {
	// NaN-Werte durch 0 ersetzen für robuste Behandlung fehlerhafter Eingaben
	deg = !isNaN(deg) ? deg : 0;
	min = !isNaN(min) ? min : 0;
	sec = !isNaN(sec) ? sec : 0;
	
	// Formel: DD = sign * (|deg| + min/60 + sec/3600)
	// Math.abs() stellt sicher, dass negative Grad-Werte korrekt behandelt werden
	const decimalDegrees = sign * (Math.abs(deg) + min / 60 + sec / 3600);
	
	// Auf 4 Nachkommastellen runden für GPS-Genauigkeit (~11m)
	return Number(decimalDegrees.toFixed(4));
}

/**
 * Konvertiert Grad und Dezimalminuten (DM) in Dezimalgrad (DD)
 * 
 * Diese Funktion verarbeitet Koordinaten im Format DDM (Degree Decimal Minutes),
 * das häufig in maritimen Anwendungen verwendet wird.
 * 
 * @param deg Grad (Ganzzahl)
 * @param min Dezimalminuten (0-59.999...)
 * @param sign Vorzeichen (1 für N/E, -1 für S/W)
 * @returns Dezimalgrad auf 4 Nachkommastellen gerundet
 * 
 * @example
 * // Konvertiert 54°30.6'N zu 54.51°
 * const lat = dmToDd(54, 30.6, 1);
 * console.log(lat); // 54.51
 */
export function dmToDd(deg: number, min: number, sign: 1 | -1): number {
	// NaN-Werte abfangen für Robustheit
	deg = !isNaN(deg) ? deg : 0;
	min = !isNaN(min) ? min : 0;
	
	// Formel: DD = sign * (|deg| + min/60)
	const decimalDegrees = sign * (Math.abs(deg) + min / 60);
	
	// Auf 4 Nachkommastellen runden
	return Number(decimalDegrees.toFixed(4));
}

/**
 * Konvertiert Dezimalgrad (DD) in Grad, Minuten und Sekunden (DMS)
 * 
 * Wandelt Dezimalgrad-Koordinaten in das traditionelle DMS-Format um,
 * das für Navigationszwecke und Benutzeranzeige verwendet wird.
 * 
 * @param dd Dezimalgrad (z.B. 54.51)
 * @returns Objekt mit Grad, Minuten und Sekunden
 * 
 * @example
 * // Konvertiert 54.51° zu 54°30'36"
 * const dms = ddToDms(54.51);
 * console.log(dms); // { deg: 54, min: 30, sec: 36 }
 */
export function ddToDms(dd: number): { deg: number; min: number; sec: number } {
	// NaN-Eingaben auf 0 setzen
	if (isNaN(dd)) dd = 0;
	
	// Vorzeichen extrahieren und Absolutwert verwenden
	const sign = dd < 0 ? -1 : 1;
	const abs = Math.abs(dd);
	
	// Grad-Teil (Ganzzahl)
	const deg = Math.floor(abs);
	
	// Minuten-Teil berechnen
	const minFloat = (abs - deg) * 60; // Dezimalminuten
	const min = Math.floor(minFloat);  // Ganze Minuten
	
	// Sekunden-Teil berechnen und runden
	const sec = Math.round((minFloat - min) * 60);
	
	return {
		deg: Number((sign * deg).toFixed(0)), // Vorzeichen nur bei Grad
		min: Number(min.toFixed(0)),
		sec: Number(sec.toFixed(0))
	};
}

/**
 * Konvertiert Dezimalgrad (DD) in Grad und Dezimalminuten (DM)
 * 
 * Wandelt Dezimalgrad-Koordinaten in das DDM-Format (Degree Decimal Minutes) um,
 * das in der Seefahrt und bei GPS-Geräten häufig verwendet wird.
 * 
 * @param dd Dezimalgrad (z.B. 54.51)
 * @returns Objekt mit Grad und Dezimalminuten (auf 2 Nachkommastellen)
 * 
 * @example
 * // Konvertiert 54.51° zu 54°30.60'
 * const dm = ddToDm(54.51);
 * console.log(dm); // { deg: 54, min: 30.6 }
 */
export function ddToDm(dd: number): { deg: number; min: number } {
	// NaN-Eingaben abfangen
	if (isNaN(dd)) dd = 0;
	
	// Vorzeichen extrahieren
	const sign = dd < 0 ? -1 : 1;
	const abs = Math.abs(dd);
	
	// Grad-Teil (Ganzzahl)
	const deg = Math.floor(abs);
	
	// Dezimalminuten berechnen
	const min = (abs - deg) * 60;
	
	return { 
		deg: Number((sign * deg).toFixed(0)), // Vorzeichen nur bei Grad
		min: Number(min.toFixed(2)) // 2 Nachkommastellen für Dezimalminuten
	};
}
