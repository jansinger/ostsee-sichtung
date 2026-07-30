/**
 * Liest die Konfiguration aus der Umgebung und prüft sie.
 * Wirft beim Start statt beim ersten Request — ein Konfigurationsfehler
 * soll beim Deploy auffallen, nicht bei der ersten echten Sichtung.
 */
export function leseKonfiguration(env) {
	const datenVerzeichnis = env.LEGACY_INBOX_DATA_DIR;
	if (!datenVerzeichnis) {
		throw new Error(
			'LEGACY_INBOX_DATA_DIR ist nicht gesetzt. Der Dienst startet ohne Datenverzeichnis nicht.'
		);
	}

	return {
		datenVerzeichnis,
		port: portAus(env.PORT, 3000),
		rateLimitProIp: Number(env.LEGACY_INBOX_RATE_LIMIT_IP) || 100,
		rateLimitGlobal: Number(env.LEGACY_INBOX_RATE_LIMIT_GLOBAL) || 1000,
		maxBodyBytes: Number(env.LEGACY_INBOX_MAX_BODY_BYTES) || 262144
	};
}

/**
 * Der Port braucht eine echte Zahlenprüfung statt der Oder-Vorgabe: 0 heißt
 * „such dir einen freien Port" und ist ein gültiger Wert, den `|| 3000`
 * stillschweigend in den festen Port verwandelt — eine Kollision, die erst
 * auffällt, wenn zwei Läufe gleichzeitig starten.
 *
 * Die übrigen Grenzwerte behalten `||` bewusst: Dort ist 0 keine Einstellung,
 * sondern ein Dienst, der nichts mehr annimmt.
 */
function portAus(wert, vorgabe) {
	if (wert === undefined || wert === null || String(wert).trim() === '') {
		return vorgabe;
	}
	const zahl = Number(wert);
	return Number.isFinite(zahl) ? zahl : vorgabe;
}
