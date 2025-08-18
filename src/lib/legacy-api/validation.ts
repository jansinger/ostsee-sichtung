/**
 * @fileoverview Validation utilities for PDF-compliant Legacy REST API
 * 
 * Provides validation functions that match EXACTLY the original schweinswalsichtung.de
 * API specification from the PDF documentation.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import type { LegacySightingRequest } from './types.js';


/**
 * Validates death finding specific fields
 */
export function validateDeathFinding(data: LegacySightingRequest, errors: Record<string, string[]>): void {
	// If anzahl_gesamt is 0, it's a death finding
	if (data.anzahl_gesamt === 0) {
		// These are warnings/recommendations, not blocking errors
		if (!data.totfund_zustand) {
			if (!errors.totfund_zustand) errors.totfund_zustand = [];
			errors.totfund_zustand.push('Dead animal condition recommended for death findings');
		}
	}
}