/**
 * Warnt, wenn die Plattformgrenze für Request-Bodies unter dem App-Limit liegt.
 *
 * `BODY_SIZE_LIMIT` wird vom Node-Adapter ausgewertet, bevor die Route läuft.
 * Ist der Wert kleiner als die konfigurierte Upload-Grenze, bricht der Upload
 * ohne die Fehlermeldung der Anwendung ab — der Melder sieht nur einen
 * allgemeinen Übertragungsfehler und erfährt nie, dass seine Datei zu groß war.
 *
 * Grundsatz: Die Plattformgrenze darf nie die bindende sein.
 */

/** Zuschlag für den Multipart-Rahmen: Feldnamen, Grenzmarken, Dateiname. */
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

const KB = 1024;
const MB = 1024 * 1024;

/**
 * Standardwert des Adapters, wenn `BODY_SIZE_LIMIT` nicht gesetzt ist.
 * Quelle: node_modules/@sveltejs/adapter-node/files/handler.js:25 —
 * `parse_as_bytes(env('BODY_SIZE_LIMIT', '512K'))`. Ein ungesetzter Wert ist
 * damit NICHT "keine Grenze", sondern der gefährlichste Fall: rund ein
 * Zweihundertstel der 100-MB-Videogrenze.
 */
const ADAPTER_DEFAULT_BODY_SIZE_LIMIT = '512K';

const SUFFIX_MULTIPLIERS: Record<string, number> = { K: KB, M: MB, G: 1024 * MB };

/**
 * Spiegelt `parse_as_bytes()` aus
 * node_modules/@sveltejs/adapter-node/files/utils.js:9-17 exakt nach —
 * inklusive Groß-/Kleinschreibung der Suffixe K/M/G. Nur so bewertet diese
 * Funktion denselben Wert, den der Adapter beim Start tatsächlich verwendet.
 * Ein Wert ohne bekannten Suffix (auch `'Infinity'`) läuft unverändert durch
 * `Number(...)` — das ist beabsichtigt, `Number('Infinity') === Infinity`.
 */
function parseAdapterBytes(value: string): number {
	const lastChar = value[value.length - 1]?.toUpperCase();
	const multiplier = lastChar !== undefined ? (SUFFIX_MULTIPLIERS[lastChar] ?? 1) : 1;
	const numeric = multiplier !== 1 ? value.substring(0, value.length - 1) : value;
	return Number(numeric) * multiplier;
}

/** Menschenlesbare Darstellung in KB oder MB, je nach Größenordnung. */
function formatBytesHuman(bytes: number): string {
	if (bytes < MB) {
		return `${Math.round(bytes / KB)} KB`;
	}
	return `${Math.round(bytes / MB)} MB`;
}

export function warnIfBodySizeLimitTooLow(
	bodySizeLimit: string | undefined,
	maxUploadBytes: number
): string | null {
	const isUnset = bodySizeLimit === undefined || bodySizeLimit === '';
	const effectiveValue = isUnset ? ADAPTER_DEFAULT_BODY_SIZE_LIMIT : bodySizeLimit;

	const limit = parseAdapterBytes(effectiveValue);
	if (!Number.isFinite(limit)) {
		// 'Infinity' ist ein bewusst zulässiger, warnungsfreier Wert (kein K/M/G-
		// Suffix, `Number('Infinity') === Infinity`, oben herausgefiltert). Alles
		// andere Nicht-Endliche wäre ein Wert, den der Adapter selbst beim Start
		// mit einem Fehler ablehnt — kein zusätzlicher Warnfall hier.
		return null;
	}

	if (limit >= maxUploadBytes + MULTIPART_OVERHEAD_BYTES) {
		return null;
	}

	const limitLabel = formatBytesHuman(limit);
	const maxLabel = formatBytesHuman(maxUploadBytes);
	const requiredMB = Math.ceil((maxUploadBytes + MULTIPART_OVERHEAD_BYTES) / MB);

	const effectiveLimitDescription = isUnset
		? `BODY_SIZE_LIMIT ist nicht gesetzt, der Adapter verwendet daher seinen Standardwert (${limitLabel})`
		: `BODY_SIZE_LIMIT ist ${limitLabel}`;

	return (
		`${effectiveLimitDescription}, die konfigurierte Upload-Grenze aber ${maxLabel}. ` +
		`Uploads über ${limitLabel} brechen ohne verständliche Fehlermeldung ab. ` +
		`Setzen Sie BODY_SIZE_LIMIT auf mindestens ${requiredMB * MB} (${requiredMB} MB) ` +
		`und die Grenze des Reverse Proxy entsprechend.`
	);
}
