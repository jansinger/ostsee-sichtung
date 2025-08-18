/**
 * @fileoverview E-Mail-Maskierungsfunktionen für Datenschutz
 * 
 * Dieses Modul bietet Funktionen zur Maskierung von E-Mail-Adressen
 * für die Anzeige in der Benutzeroberfläche. Dies gewährleistet
 * Datenschutz bei der Darstellung von Kontaktdaten in Sichtungen.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

/**
 * Maskiert eine E-Mail-Adresse für die datenschutzkonforme Anzeige
 * 
 * Zeigt nur den ersten Buchstaben des lokalen Teils an und ersetzt
 * den Rest durch Sterne. Die Domain bleibt vollständig sichtbar,
 * da sie keine personenbezogenen Daten enthält.
 * 
 * @param email Die zu maskierende E-Mail-Adresse
 * @returns Maskierte E-Mail-Adresse oder Fallback-Maskierung bei Fehlern
 * 
 * @example
 * maskEmail("max.mustermann@example.com"); // "m***@example.com"
 * maskEmail("a@test.de"); // "a@test.de"
 * maskEmail("invalid-email"); // "***@***.***"
 * 
 * @note Die Maskierung ist DSGVO-konform und schützt personenbezogene Daten
 *       bei gleichzeitiger Erkennbarkeit der E-Mail-Struktur
 */
export function maskEmail(email: string): string {
	// Validierung: Prüfe auf gültige E-Mail-Struktur
	if (!email || !email.includes('@')) {
		return '***@***.***'; // Fallback-Maskierung für ungültige Eingaben
	}

	// Teile E-Mail an '@'-Zeichen
	const parts = email.split('@');
	
	// Validierung: Genau ein '@'-Zeichen erforderlich
	if (parts.length !== 2) {
		return '***@***.***';
	}
	
	const [localPart, domain] = parts;
	
	// Validierung: Beide Teile müssen vorhanden sein
	if (!localPart || !domain) {
		return '***@***.***';
	}
	
	// Lokaler Teil: Zeige ersten Buchstaben, dann maximal 3 Sterne
	const maskedLocal = localPart.length > 0 
		? localPart[0] + '*'.repeat(Math.min(localPart.length - 1, 3))
		: '***';
	
	// Domain bleibt unverändert (keine personenbezogenen Daten)
	return `${maskedLocal}@${domain}`;
}