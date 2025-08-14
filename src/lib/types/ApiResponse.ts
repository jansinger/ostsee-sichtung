/**
 * API response interfaces
 */

export interface SightingResponse {
	ts: string;
	id: number;
	dt: string;
	ti: string;
	lat: number;
	lon: number;
	ct: number;
	yo: number;
	ta: number;
	tf: number;
	na: string | null;
	ar: string;
	sh: string | null;
}

/**
 * Interface für die API-Antwort bei Erstellung einer neuen Sichtung
 */
export interface CreateSightingResponse {
	success: boolean;
	id?: number;
	message?: string;
}