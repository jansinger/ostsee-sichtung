import { createLogger } from '$lib/logger.server';
import type { SpamCheckResult, SpamDetectionInput } from '$lib/types/spam';
import { isUnknownOrMissingSpecies } from '$lib/utils/format/sightingFormatter';

export type { SpamCheckResult, SpamDetectionInput };

const logger = createLogger('spamDetector');

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

// Single-pass HTML entity decoding to avoid double-unescaping (e.g. &amp;gt; → &gt; → >)
const HTML_ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'"
};

/**
 * Decodes common HTML entities in text before analysis.
 * Uses a single-pass replacement to prevent double-unescaping.
 */
function decodeHtmlEntities(text: string): string {
	return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => HTML_ENTITIES[match] ?? match);
}

/**
 * Detects spam indicators in a sighting submission using heuristic checks.
 */
export async function detectSpamIndicators(sighting: SpamDetectionInput): Promise<SpamCheckResult> {
	try {
		const indicators: string[] = [];
		let score = 0;

		// Raw (non-lowercased) text fields needed for capital-letter heuristic
		const rawTextFields = [
			sighting.notes || '',
			sighting.firstName || '',
			sighting.lastName || '',
			sighting.waterway || '',
			sighting.seaMark || ''
		]
			.map(decodeHtmlEntities)
			.join(' ');

		// All text fields combined for keyword checks (HTML-decoded, lowercased)
		const textFields = [
			sighting.notes || '',
			sighting.firstName || '',
			sighting.lastName || '',
			sighting.email || '',
			sighting.waterway || '',
			sighting.seaMark || ''
		]
			.map(decodeHtmlEntities)
			.join(' ')
			.toLowerCase();

		// Non-email text fields for URL detection (email addresses contain .com by design)
		const nonEmailTextFields = rawTextFields.toLowerCase();

		// --- Heuristic checks ---

		if (nonEmailTextFields && nonEmailTextFields.length >= 3) {
			// URLs or links in text fields (excluding email to avoid false positives)
			if (
				/(https?:\/\/|www\.|\.com|\.org|\.de\/|\[url\]|\[link\]|[a-z0-9-]{2,}\.[a-z]{2,4}\/[^\s]{3,})/i.test(
					nonEmailTextFields
				)
			) {
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

			// Excessive punctuation (lowercased text) or excessive capitals (raw text)
			if (/[!]{3,}|[?]{3,}/.test(textFields) || /[A-Z]{10,}/.test(rawTextFields)) {
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
		// Explicit null check: latitude/longitude of 0 is a valid (if unlikely) coordinate
		if (sighting.latitude != null && sighting.longitude != null) {
			const lat = Number(sighting.latitude);
			const lng = Number(sighting.longitude);
			if (lat < 53.0 || lat > 66.0 || lng < 9.0 || lng > 31.0) {
				indicators.push('Position weit außerhalb der Ostsee');
				score += 2;
			}
		}

		return {
			score: Math.min(score, 10), // clamp to 0–10 scale; ≥5 = high risk
			isHighRisk: score >= 5,
			indicators
		};
	} catch (error: unknown) {
		logger.warn({ error }, 'Fehler bei Spam-Erkennung, überspringe');
		return {
			score: 0,
			isHighRisk: false,
			indicators: ['Spam-Prüfung fehlgeschlagen']
		};
	}
}
