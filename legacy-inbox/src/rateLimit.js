const STUNDE_MS = 3_600_000;

/**
 * Gleitende Stundenfenster, im Speicher gehalten.
 *
 * Die beiden Prüfungen haben unterschiedliche Rollen (Entwurf, Abschnitt 6):
 * pruefeIp() begrenzt die Antwort, nachdem geschrieben wurde; pruefeGlobal()
 * ist die einzige Regel, die vor dem Schreiben abweisen darf.
 */
export function erstelleRateLimit({ proIpProStunde, globalProStunde, jetzt = Date.now }) {
	const proIp = new Map();
	let globalZeitstempel = [];

	function beschneide(zeitstempel, grenze) {
		return zeitstempel.filter((t) => t > grenze);
	}

	function pruefeIp(ip) {
		const grenze = jetzt() - STUNDE_MS;

		// Aufräumen bei jedem Aufruf: Ohne das wächst die Map mit jeder je
		// gesehenen IP weiter — bei CGNAT und Streuverkehr sind das viele.
		for (const [bekannteIp, zeitstempel] of proIp) {
			const uebrig = beschneide(zeitstempel, grenze);
			if (uebrig.length === 0) proIp.delete(bekannteIp);
			else proIp.set(bekannteIp, uebrig);
		}

		const eigene = proIp.get(ip) ?? [];
		if (eigene.length >= proIpProStunde) return false;

		eigene.push(jetzt());
		proIp.set(ip, eigene);
		return true;
	}

	function pruefeGlobal() {
		const grenze = jetzt() - STUNDE_MS;
		globalZeitstempel = beschneide(globalZeitstempel, grenze);

		if (globalZeitstempel.length >= globalProStunde) return false;

		globalZeitstempel.push(jetzt());
		return true;
	}

	return { pruefeIp, pruefeGlobal, anzahlBeobachteterIps: () => proIp.size };
}
