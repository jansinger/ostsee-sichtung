export interface SpamCheckResult {
	score: number;
	scannerScore: number;
	isSpam: boolean;
	isHighRisk: boolean;
	indicators: string[];
}

/**
 * Minimal input type for spam detection.
 * Accepts only the fields actually used by detectSpamIndicators,
 * so callers don't need to pass a full SightingFormValues.
 * Fields explicitly include undefined to be compatible with Yup's Maybe<T> types.
 */
export interface SpamDetectionInput {
	notes?: string | null | undefined;
	firstName?: string | null | undefined;
	lastName?: string | null | undefined;
	email?: string | null | undefined;
	waterway?: string | null | undefined;
	seaMark?: string | null | undefined;
	species?: number | null | undefined;
	latitude?: number | null | undefined;
	longitude?: number | null | undefined;
}
