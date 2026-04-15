import { createLogger } from '$lib/logger.server';
import type { SightingFormValues } from '$lib/types/Form';
import { isUnknownOrMissingSpecies } from '$lib/utils/format/sightingFormatter';
import SpamScanner from 'spamscanner';

const logger = createLogger('spamDetector');

export interface SpamCheckResult {
	score: number;
	scannerScore: number;
	isSpam: boolean;
	isHighRisk: boolean;
	indicators: string[];
}

const ENGLISH_SPAM_KEYWORDS = [
	'sale',
	'discount',
	'free',
	'win',
	'prize',
	'money',
	'cash',
	'deal',
	'offer',
	'viagra',
	'casino',
	'loan'
];

const GERMAN_SPAM_KEYWORDS = [
	'kostenlos',
	'gewinn',
	'gratis',
	'kredit',
	'verdienst',
	'rabatt',
	'angebot',
	'sonderangebot',
	'investition',
	'garantiert'
];

const DISPOSABLE_EMAIL_DOMAINS = [
	'mailinator.com',
	'tempmail.com',
	'guerrillamail.com',
	'throwam.com',
	'maildrop.cc',
	'yopmail.com',
	'trashmail.com',
	'fakeinbox.com',
	'10minutemail.com'
];

/**
 * Runs SpamScanner on the sighting's text content.
 * Returns isSpam and a normalized 0–100 score.
 * Falls back gracefully on errors or missing text.
 */
async function runSpamScanner(
	text: string
): Promise<{ isSpam: boolean; scannerScore: number; indicator: string | null }> {
	if (!text || text.trim().length < 10) {
		return { isSpam: false, scannerScore: 0, indicator: null };
	}

	try {
		const scanner = new SpamScanner();
		const result = await scanner.scan(text);
		const isSpam = Boolean(result.isSpam);
		const scannerScore = isSpam ? 100 : 0;
		const indicator = isSpam && result.message ? `SpamScanner: ${result.message}` : null;
		return { isSpam, scannerScore, indicator };
	} catch (error: unknown) {
		logger.warn({ error }, 'SpamScanner fehler, verwende Fallback');
		return { isSpam: false, scannerScore: 0, indicator: null };
	}
}

/**
 * Detects spam indicators in a sighting form submission.
 * Combines heuristic checks with SpamScanner analysis.
 */
export async function detectSpamIndicators(sighting: SightingFormValues): Promise<SpamCheckResult> {
	try {
		const indicators: string[] = [];
		let score = 0;

		// All text fields combined for keyword checks
		const textFields = [
			sighting.notes || '',
			sighting.firstName || '',
			sighting.lastName || '',
			sighting.email || '',
			sighting.waterway || '',
			sighting.seaMark || ''
		]
			.join(' ')
			.toLowerCase();

		// Non-email text fields for URL detection (email addresses contain .com by design)
		const nonEmailTextFields = [
			sighting.notes || '',
			sighting.firstName || '',
			sighting.lastName || '',
			sighting.waterway || '',
			sighting.seaMark || ''
		]
			.join(' ')
			.toLowerCase();

		// --- Heuristic checks ---

		if (nonEmailTextFields && nonEmailTextFields.length >= 3) {
			// URLs or links in text fields (excluding email to avoid false positives)
			if (/(https?:\/\/|www\.|\.com|\.org|\.de\/|\[url\]|\[link\])/i.test(nonEmailTextFields)) {
				indicators.push('Enthält verdächtige URLs oder Links');
				score += 3;
			}
		}

		if (textFields && textFields.length >= 3) {
			// English spam keywords
			const foundEnglish = ENGLISH_SPAM_KEYWORDS.filter((kw) => textFields.includes(kw));
			if (foundEnglish.length > 0) {
				indicators.push(`Spam-Keywords gefunden: ${foundEnglish.join(', ')}`);
				score += foundEnglish.length * 2;
			}

			// German spam keywords
			const foundGerman = GERMAN_SPAM_KEYWORDS.filter((kw) => textFields.includes(kw));
			if (foundGerman.length > 0) {
				indicators.push(`Deutsche Spam-Keywords gefunden: ${foundGerman.join(', ')}`);
				score += foundGerman.length * 2;
			}

			// Excessive punctuation or capitals
			if (/[!]{3,}|[?]{3,}|[A-Z]{10,}/.test(textFields)) {
				indicators.push('Übermäßige Satzzeichen oder Großbuchstaben');
				score += 2;
			}
		}

		// Unknown or missing species
		if (isUnknownOrMissingSpecies(sighting.species)) {
			indicators.push('Keine oder unbekannte Tierart angegeben');
			score += 1;
		}

		// Email-based checks
		if (sighting.email) {
			const emailLower = sighting.email.toLowerCase();
			const domain = emailLower.split('@')[1] ?? '';

			// Disposable email domains
			if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
				indicators.push(`Wegwerf-E-Mail-Domain erkannt: ${domain}`);
				score += 3;
			}

			// Noreply / donotreply addresses
			if (emailLower.includes('noreply') || emailLower.includes('donotreply')) {
				indicators.push('Verdächtige E-Mail-Adresse (noreply)');
				score += 2;
			}

			// Many digits before @
			if (/\d{5,}@/.test(sighting.email)) {
				indicators.push('E-Mail mit vielen Zahlen (verdächtig)');
				score += 1;
			}
		}

		// Position outside Baltic Sea bounding box
		if (sighting.latitude && sighting.longitude) {
			const lat = Number(sighting.latitude);
			const lng = Number(sighting.longitude);
			if (lat < 53.0 || lat > 66.0 || lng < 9.0 || lng > 31.0) {
				indicators.push('Position weit außerhalb der Ostsee');
				score += 2;
			}
		}

		// --- SpamScanner analysis ---
		const notesText = sighting.notes || '';
		const { isSpam, scannerScore, indicator } = await runSpamScanner(notesText);

		if (indicator) {
			indicators.push(indicator);
		}

		if (scannerScore >= 50) {
			indicators.push(`SpamScanner-Score: ${scannerScore}/100`);
		}

		return {
			score,
			scannerScore,
			isSpam,
			isHighRisk: score >= 5 || isSpam,
			indicators
		};
	} catch (error: unknown) {
		logger.warn({ error }, 'Fehler bei Spam-Erkennung, überspringe');
		return {
			score: 0,
			scannerScore: 0,
			isSpam: false,
			isHighRisk: false,
			indicators: ['Spam-Prüfung fehlgeschlagen']
		};
	}
}
