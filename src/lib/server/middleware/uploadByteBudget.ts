/**
 * Volumen-Bremse für Datei-Uploads, zusätzlich zum Zähler-Rate-Limit.
 *
 * `FILE_UPLOAD_ANONYMOUS` begrenzt die ANZAHL der Uploads (20/h). Solange eine
 * Datei höchstens 10 MB groß sein durfte, war damit auch das Volumen gedeckelt.
 * Mit 100 MB je Video sind es 2 GB pro IP und Stunde — mehr als der gesamte
 * Medienbestand aus 13 Jahren.
 *
 * Das Gesamtlimit je Meldung (`security.maxTotalUploadSize`) schützt hier
 * NICHT: Die `referenceId` liefert der Client, eine neue CUID je Datei umgeht
 * es vollständig. Diese Buchführung hängt dagegen an derselben Kennung wie das
 * Rate Limit (IP bzw. `sub`).
 *
 * In-Memory wie `rateLimit.ts` — bei mehreren Instanzen zählt jede für sich.
 * Das ist bewusst dieselbe Einschränkung wie beim bestehenden Rate Limit und
 * kein neuer Kompromiss.
 */
export interface ByteBudget {
	windowMs: number;
	maxBytes: number;
}

export interface ByteBudgetResult {
	allowed: boolean;
	usedBytes: number;
	remainingBytes: number;
	resetAt: number;
}

interface BudgetEntry {
	usedBytes: number;
	resetAt: number;
}

const budgets = new Map<string, BudgetEntry>();

/** Räumt abgelaufene Konten ab, damit die Map nicht unbegrenzt wächst. */
function sweep(now: number): void {
	for (const [key, entry] of budgets) {
		if (entry.resetAt <= now) {
			budgets.delete(key);
		}
	}
}

export function consumeByteBudget(
	identifier: string,
	bytes: number,
	budget: ByteBudget
): ByteBudgetResult {
	const now = Date.now();
	sweep(now);

	const existing = budgets.get(identifier);
	const entry: BudgetEntry =
		existing && existing.resetAt > now
			? existing
			: { usedBytes: 0, resetAt: now + budget.windowMs };

	const wouldUse = entry.usedBytes + bytes;

	if (wouldUse > budget.maxBytes) {
		// Bewusst NICHT abbuchen: Sonst sperrt ein einzelner zu großer Versuch
		// die Kennung für den Rest des Fensters aus, obwohl nichts übertragen
		// wurde.
		budgets.set(identifier, entry);
		return {
			allowed: false,
			usedBytes: entry.usedBytes,
			remainingBytes: budget.maxBytes - entry.usedBytes,
			resetAt: entry.resetAt
		};
	}

	entry.usedBytes = wouldUse;
	budgets.set(identifier, entry);

	return {
		allowed: true,
		usedBytes: entry.usedBytes,
		remainingBytes: budget.maxBytes - entry.usedBytes,
		resetAt: entry.resetAt
	};
}

/** Setzt alle Konten zurück. Nur für Tests. */
export function resetByteBudgets(): void {
	budgets.clear();
}
