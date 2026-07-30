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
		port: Number(env.PORT) || 3000,
		rateLimitProIp: Number(env.LEGACY_INBOX_RATE_LIMIT_IP) || 100,
		rateLimitGlobal: Number(env.LEGACY_INBOX_RATE_LIMIT_GLOBAL) || 1000,
		maxBodyBytes: Number(env.LEGACY_INBOX_MAX_BODY_BYTES) || 262144
	};
}
