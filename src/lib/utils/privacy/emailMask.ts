/**
 * Maskiert eine E-Mail-Adresse für die Anzeige
 * Beispiel: max.mustermann@example.com -> m***@example.com
 */
export function maskEmail(email: string): string {
	if (!email || !email.includes('@')) {
		return '***@***.***';
	}

	const parts = email.split('@');
	if (parts.length !== 2) {
		return '***@***.***';
	}
	
	const [localPart, domain] = parts;
	
	if (!localPart || !domain) {
		return '***@***.***';
	}
	
	// Lokaler Teil: Zeige ersten Buchstaben, dann Sterne
	const maskedLocal = localPart.length > 0 
		? localPart[0] + '*'.repeat(Math.min(localPart.length - 1, 3))
		: '***';
	
	// Domain: Zeige nur Domain, keine Maskierung nötig für Domain
	return `${maskedLocal}@${domain}`;
}