export interface SpamCheckResult {
	score: number;
	isHighRisk: boolean;
	indicators: string[];
}

/**
 * Minimal input type for spam detection.
 * Accepts only the fields actually used by detectSpamIndicators,
 * so callers don't need to pass a full SightingFormValues.
 *
 * Note: `| undefined` is required (not redundant) because this project uses
 * `exactOptionalPropertyTypes: true`. Without it, callers passing Yup's `Maybe<T>`
 * values (which include explicit `undefined`) would fail type-checking.
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
