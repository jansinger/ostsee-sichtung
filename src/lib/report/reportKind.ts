import {
	loadFromStorage,
	removeFromStorage,
	saveToStorage,
	STORAGE_KEYS
} from '$lib/storage/localStorage';

/** Die zwei Zweige des Meldeformulars. */
export type ReportKind = 'alive' | 'dead';

/**
 * Der Query-Parameter ist bewusst deutsch: Er steht in Links, die das Museum
 * selbst setzt und liest.
 *
 * Map statt Objektliteral: Der Parameterwert kommt fremdkontrolliert aus der
 * URL. Ein Objektliteral als Lookup-Tabelle würde für geerbte Property-Namen
 * wie `constructor` oder `__proto__` truthy Werte statt `undefined` liefern.
 */
const PARAM_TO_KIND = new Map<string, ReportKind>([
	['lebend', 'alive'],
	['totfund', 'dead']
]);

export function reportKindToIsDead(kind: ReportKind): boolean {
	return kind === 'dead';
}

/**
 * Der Query-Parameter-Wert für einen Zweig. Eigenständige, über `ReportKind`
 * erschöpfende Zuordnung — kein Aufruf von `PARAM_TO_KIND.get()` in
 * Gegenrichtung, weil eine `Map` dafür keinen erschöpfenden Zugriff bietet.
 * Ein `switch` über `ReportKind` lässt TypeScript meckern, sobald ein
 * dritter Zweig hinzukommt, statt still `'lebend'` zu liefern.
 */
export function reportKindToParam(kind: ReportKind): 'lebend' | 'totfund' {
	switch (kind) {
		case 'alive':
			return 'lebend';
		case 'dead':
			return 'totfund';
	}
}

/**
 * Entscheidet, welcher Zweig gilt — und ob die Auswahlseite überhaupt erscheint.
 *
 * Rein und ohne Browser-Zugriff, damit die Zustandsmaschine inklusive
 * Migrationspfad in Node testbar bleibt.
 *
 * @param param     Wert von `?meldung=` oder null
 * @param stored    Zuvor gespeicherter Zweig oder null
 * @param savedIsDead `isDead` aus gespeicherten Formulardaten oder null.
 *                  Nur für den Altbestand relevant: Wer beim Deploy mitten im
 *                  Formular sitzt, hat noch kein `reportKind` — sein Zweig wird
 *                  aus `isDead` abgeleitet, statt ihn zurückzuwerfen.
 * @returns Der geltende Zweig, oder null wenn die Auswahlseite erscheinen muss.
 */
export function resolveReportKind(
	param: string | null,
	stored: ReportKind | null,
	savedIsDead: boolean | null
): ReportKind | null {
	const fromParam = param ? PARAM_TO_KIND.get(param) : undefined;
	if (fromParam) {
		return fromParam;
	}
	if (stored) {
		return stored;
	}
	if (savedIsDead !== null) {
		return savedIsDead ? 'dead' : 'alive';
	}
	return null;
}

export function readReportKind(): ReportKind | null {
	return loadFromStorage<ReportKind | null>(STORAGE_KEYS.REPORT_KIND, null);
}

export function writeReportKind(kind: ReportKind): void {
	saveToStorage(STORAGE_KEYS.REPORT_KIND, kind);
}

export function clearReportKind(): void {
	removeFromStorage(STORAGE_KEYS.REPORT_KIND);
}
