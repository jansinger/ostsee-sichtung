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

export function warnIfBodySizeLimitTooLow(
	bodySizeLimit: string | undefined,
	maxUploadBytes: number
): string | null {
	if (!bodySizeLimit || bodySizeLimit === 'Infinity') {
		return null;
	}

	const limit = Number(bodySizeLimit);
	if (!Number.isFinite(limit)) {
		return null;
	}

	if (limit >= maxUploadBytes + MULTIPART_OVERHEAD_BYTES) {
		return null;
	}

	const limitMB = Math.round(limit / 1024 / 1024);
	const maxMB = Math.round(maxUploadBytes / 1024 / 1024);
	const requiredMB = Math.ceil((maxUploadBytes + MULTIPART_OVERHEAD_BYTES) / 1024 / 1024);

	return (
		`BODY_SIZE_LIMIT ist ${limitMB} MB, die konfigurierte Upload-Grenze aber ${maxMB} MB. ` +
		`Uploads über ${limitMB} MB brechen ohne verständliche Fehlermeldung ab. ` +
		`Setzen Sie BODY_SIZE_LIMIT auf mindestens ${requiredMB * 1024 * 1024} (${requiredMB} MB) ` +
		`und die Grenze des Reverse Proxy entsprechend.`
	);
}
