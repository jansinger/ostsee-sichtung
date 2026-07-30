/**
 * @fileoverview Auflösung der Datenbankverbindung für Wartungs-Werkzeuge
 *
 * Die beiden Funktionen standen zuerst in `cleanup-orphaned-uploads.ts`. Sie
 * liegen hier, seit ein zweites schreibendes Werkzeug dazugekommen ist
 * (`refresh-email-template.ts`): Ein Werkzeug, das seine Zieldatenbank rät,
 * ist gefährlich, und diese Zusicherung darf nicht davon abhängen, welches
 * Werkzeug man gerade aufruft.
 */

/**
 * Liefert die Verbindungszeichenfolge oder wirft. **Kein Fallback auf eine
 * Standardverbindung:** Diese Werkzeuge schreiben, sie dürfen die Zieldatenbank
 * nie raten. In einem Git-Worktree fehlt die `.env` regelmäßig — genau dort wäre
 * ein geratener Fallback auf die falsche Datenbank gegangen.
 */
export function resolveConnectionString(env: NodeJS.ProcessEnv): string {
	const connectionString = env.DATABASE_POSTGRES_URL || env.DATABASE_URL;
	if (!connectionString) {
		throw new Error(
			'Keine Datenbankverbindung gefunden. DATABASE_POSTGRES_URL (bevorzugt) oder ' +
				'DATABASE_URL muss gesetzt sein — in der Umgebung oder in einer .env im ' +
				'Arbeitsverzeichnis.'
		);
	}
	return connectionString;
}

/** Verdeckt das Passwort in einer Verbindungszeichenfolge für die Ausgabe. */
export function maskConnection(connectionString: string): string {
	return connectionString.replace(/:[^:@]*@/, ':****@');
}
