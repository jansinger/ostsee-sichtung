/**
 * Handgeschriebene Typdeklaration für analyse-legacy-inbox.js.
 *
 * Gleicher Grund wie bei import-legacy-inbox.d.ts: `src/tools/**\/*.js` ist in
 * tsconfig.json bewusst von der Typprüfung ausgeschlossen, weil Tool-Skripte
 * sonst nirgends importiert werden und nie geprüft würden. Dieses Skript wird
 * aber von analyse-legacy-inbox.test.ts importiert, wodurch tsc es trotz
 * Exclude transitiv in den Programmgraphen zieht. Eine co-lokierte `.d.ts`
 * mit demselben Basisnamen hat bei der Modulauflösung Vorrang vor der
 * `.js`-Implementierung, sodass der Test gegen diese lockeren Typen prüft,
 * ohne die JS-Datei selbst mit Annotationen zu verunreinigen oder ihren
 * Rumpf unter `strict` laufen zu lassen.
 */

/** Ein Eintrag aus der Feldtabelle in docs/LEGACY_API_SPECIFICATION.md. */
export interface ContractFieldRule {
	required?: boolean;
	personal?: boolean;
	maxLength?: number;
	range?: [number, number];
	boolean?: boolean;
	wind?: boolean;
}

export const ACCEPTED_WIND_DIRECTIONS: string[];
export const CONTRACT_FIELDS: Record<string, ContractFieldRule>;

export interface FieldStat {
	name: string;
	count: number;
	types: string[];
	inContract: boolean;
	personal: boolean;
	values: unknown[];
}

export interface Violation {
	file: string;
	field: string;
	value: unknown;
	reason: string;
}

export interface MissingRequiredField {
	field: string;
	count: number;
	files: string[];
}

export interface TimeEntry {
	file: string;
	sichtungsdatum: string;
	empfangenAm: string;
	diffMinutes: number | null;
}

export interface RejectedEnvelope {
	file: string;
	errors: Record<string, string[]>;
}

export interface AnalysisResult {
	counts: { posteingang: number; abgewiesen: number; importiert: number };
	rejected: RejectedEnvelope[];
	fields: FieldStat[];
	neverSent: string[];
	violations: Violation[];
	missingRequired: MissingRequiredField[];
	times: TimeEntry[];
}

export function analysiere(datenVerzeichnis: string): Promise<AnalysisResult>;
export function formatiere(ergebnis: AnalysisResult): string;
