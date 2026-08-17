/**
 * Schickt die Dateien des Legacy-Posteingangs an eine laufende Instanz und
 * verschiebt jede angenommene Datei nach importiert/.
 *
 * Warum HTTP und nicht der direkte Weg wie in import-legacy-inbox.js? Weil das
 * Ziel hier die Produktion ist. Der direkte Import braucht eine Verbindung zur
 * Produktionsdatenbank; deren Port ist auf dem Produktionsserver bewusst nicht
 * veröffentlicht, und ein Lauf im Container scheidet aus, weil dort kein
 * Quellcode liegt. Bleibt der Weg, den die App selbst genommen hat:
 * `POST /rest_sichtungen`.
 *
 * Das hat einen Nebeneffekt, der kein Nachteil ist: Der Endpunkt validiert
 * jede Meldung mit demselben Yup-Schema wie bei einer echten App-Meldung.
 * Der direkte Import tut das nicht — er ruft nur Mapping und Repository. Was
 * hier durchkommt, hätte die App auch live einliefern können.
 *
 * Der Preis ist das Rate-Limit von 20 Meldungen pro Stunde und IP
 * (`RATE_LIMITS.SIGHTING_SUBMISSION`). Bei einem `429` bricht der Lauf ab. Das
 * ist unproblematisch, weil die Datei selbst das Protokoll ist: Übernommenes
 * liegt in importiert/, Offenes in posteingang/. Ein Neustart nach Ablauf des
 * Fensters macht dort weiter, wo der letzte Lauf stehen geblieben ist, und
 * kann nichts doppelt anlegen.
 *
 * Aufruf über die Kommandozeile: npm run send:legacy-inbox -- <ziel-url>
 * Der Einstiegspunkt liegt in send-legacy-inbox-cli.js; diese Datei ist reines
 * Modul und führt beim Import nichts aus.
 */
import { execFile } from 'node:child_process';
import { access, readdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Leitet aus einem geworfenen Wert eine Meldung ab, ohne selbst zu werfen.
 * Gleiche Begründung wie in import-legacy-inbox.js: Die Fehler kommen aus
 * fremdem Gebiet (JSON.parse über Client-Daten, fetch, ssh), und `throw null`
 * ist erlaubt.
 */
export function fehlerText(fehler) {
	if (fehler instanceof Error && typeof fehler.message === 'string') return fehler.message;
	if (typeof fehler === 'string') return fehler;
	try {
		return String(fehler);
	} catch {
		return 'Unbekannter Fehler';
	}
}

/**
 * Meldung für den einen Konflikt, den beide Speicher gleich behandeln müssen:
 * In importiert/ liegt bereits eine Datei dieses Namens.
 *
 * Das ist immer ein Hinweis auf einen unterbrochenen früheren Lauf und darf
 * niemals still hingenommen werden — weder durch Überschreiben (die ältere
 * Fassung wäre weg) noch durch Nichtstun (die Datei bliebe in posteingang/
 * liegen und der nächste Lauf legte dieselbe Sichtung ein zweites Mal an).
 * Deshalb wirft es, und `sende()` bricht den Lauf mit Grund `verschieben` ab.
 */
function konflikt(datei) {
	return new Error(
		`In importiert/ liegt bereits ${datei} — der Lauf würde die ältere Fassung ` +
			'überschreiben oder die Datei liegen lassen. Von Hand klären.'
	);
}

/**
 * Posteingang im lokalen Dateisystem.
 */
export function erstelleDateiSpeicher(datenVerzeichnis) {
	const eingang = path.join(datenVerzeichnis, 'posteingang');
	const erledigt = path.join(datenVerzeichnis, 'importiert');

	return {
		beschreibung: datenVerzeichnis,
		liste: async () => (await readdir(eingang)).filter((d) => d.endsWith('.json')).sort(),
		lies: (datei) => readFile(path.join(eingang, datei), 'utf8'),
		verschiebe: async (datei) => {
			const ziel = path.join(erledigt, datei);

			// `rename()` überschreibt still — deshalb die Prüfung davor. Das ist
			// kein Schutz gegen einen gleichzeitigen zweiten Lauf (dafür wäre es
			// ein Wettlauf), sondern gegen den Fall, den es hier wirklich gibt:
			// Reste eines abgebrochenen Laufs.
			if (await existiert(ziel)) throw konflikt(datei);

			await rename(path.join(eingang, datei), ziel);
		}
	};
}

async function existiert(pfad) {
	try {
		await access(pfad);
		return true;
	} catch {
		return false;
	}
}

const ERLAUBTER_DATEINAME = /^[A-Za-z0-9._-]+\.json$/;

/**
 * Ein Rechnername darf nicht mit `-` beginnen: `execFile` übergibt ihn als
 * Argument an `ssh`, und alles, was mit `-` anfängt, liest `ssh` als Option.
 * Ein `host` wie `-oProxyCommand=…` wäre damit ein beliebiger lokaler Befehl.
 * `@` ist erlaubt (`benutzer@rechner`), `:` nicht — der Trenner gehört in den
 * Aufrufer, nicht in den Wert.
 */
const ERLAUBTER_HOST = /^[A-Za-z0-9._@][A-Za-z0-9._@-]*$/;

/**
 * Absoluter Pfad aus einem engen Zeichensatz. Anders als die Dateinamen kommt
 * dieser Wert vom Aufrufer und nicht aus einem fremden Verzeichnis — die
 * Begründung ist trotzdem dieselbe: Er landet in einer Kommandozeile, die auf
 * der Gegenseite eine Shell parst. Ein Leerzeichen zerlegte den Pfad still in
 * zwei Argumente, ein `;` wäre ausführbarer Code.
 */
const ERLAUBTES_VERZEICHNIS = /^\/[A-Za-z0-9._/-]*$/;

/**
 * Posteingang auf einem entfernten Rechner, erreichbar über SSH.
 *
 * Der Posteingang gehört dem Anwendungsbenutzer der Domain und ist mit 700
 * gegen alle anderen abgeriegelt (legacy-inbox/README.md, Schritt 4) — genau
 * so soll es sein, denn dort liegen Namen, Adressen und Telefonnummern der
 * Melder. Ein Zugriff über den eigenen SSH-Benutzer kommt deshalb nur mit
 * `sudo` daran.
 *
 * Dateinamen werden vor jedem Aufruf gegen ein enges Muster geprüft. `ssh`
 * fügt seine Argumente auf der Gegenseite wieder zu einer Kommandozeile
 * zusammen, die dort durch eine Shell läuft — `execFile` statt `exec`
 * verhindert also nur die *lokale* Shell, nicht die entfernte. Ein Dateiname
 * mit `;` oder `$(…)` wäre damit ausführbarer Code auf dem Plesk-Server. Der
 * Posteingang-Dienst vergibt die Namen zwar selbst und nach festem Schema,
 * aber diese Zusicherung liegt in einem anderen Projekt und kann sich ändern;
 * die Prüfung hier kostet nichts und hängt von nichts ab.
 */
export function erstelleSshSpeicher({
	host,
	datenVerzeichnis,
	sudo = true,
	ausfuehren,
	log = console
}) {
	if (!ERLAUBTER_HOST.test(host)) {
		throw new Error(`Rechnername nicht verwendbar: ${JSON.stringify(host)}`);
	}
	if (!ERLAUBTES_VERZEICHNIS.test(datenVerzeichnis)) {
		throw new Error(
			`Datenverzeichnis nicht verwendbar: ${JSON.stringify(datenVerzeichnis)} — ` +
				'erwartet wird ein absoluter Pfad ohne Leerzeichen und Sonderzeichen.'
		);
	}

	// `BatchMode=yes`: Ohne das bleibt ssh bei unbekanntem Hostkey oder
	// passphrasegeschütztem Schlüssel an einer Eingabeaufforderung hängen. In
	// einem Cron-Lauf wäre das kein Fehler, sondern ein Prozess, der ewig
	// wartet und nie meldet, warum.
	//
	// `--` beendet die Optionsauswertung von ssh. Die Prüfung oben schließt
	// einen führenden Bindestrich bereits aus; beides zusammen heißt, dass
	// diese Stelle auch dann hält, wenn jemand das Muster später lockert.
	const lauf =
		ausfuehren ??
		((argumente) => execFileAsync('ssh', ['-o', 'BatchMode=yes', '--', host, ...argumente]));
	const praefix = sudo ? ['sudo', '-n'] : [];
	const eingang = `${datenVerzeichnis}/posteingang`;
	const erledigt = `${datenVerzeichnis}/importiert`;

	const sichererName = (datei) => {
		if (!ERLAUBTER_DATEINAME.test(datei)) {
			throw new Error(`Dateiname nicht verwendbar: ${JSON.stringify(datei)}`);
		}
		return datei;
	};

	return {
		beschreibung: `${host}:${datenVerzeichnis}`,
		liste: async () => {
			const { stdout } = await lauf([...praefix, 'ls', '-1', eingang]);
			const zeilen = stdout
				.split('\n')
				.map((zeile) => zeile.trim())
				.filter((zeile) => zeile !== '');

			// Aussortierte Namen laut melden statt still verschlucken: Eine
			// solche Datei taucht sonst weder in `gesamt` noch in `abgelehnt`
			// auf, und niemand erfährt, dass im Posteingang etwas liegt, das
			// nie jemand ansieht.
			for (const zeile of zeilen.filter((z) => !ERLAUBTER_DATEINAME.test(z))) {
				log.error(`${zeile}: unerwarteter Dateiname — wird übersprungen und bleibt liegen`);
			}

			return zeilen.filter((zeile) => ERLAUBTER_DATEINAME.test(zeile)).sort();
		},
		lies: async (datei) => {
			const { stdout } = await lauf([...praefix, 'cat', `${eingang}/${sichererName(datei)}`]);
			return stdout;
		},
		verschiebe: async (datei) => {
			sichererName(datei);

			// Zwei Aufrufe statt `mv -n`, und das ist der Kern der Sache:
			// `mv -n` verweigert das Überschreiben zwar, endet dabei aber mit
			// Exit 0 und lässt die Quelle liegen (auf macOS wie unter GNU
			// nachgemessen). Für den Aufrufer sähe das aus wie ein geglücktes
			// Verschieben — die Datei bliebe in posteingang/, und der nächste
			// Lauf schickte dieselbe Sichtung ein zweites Mal an die Produktion.
			// Ein Duplikat, erzeugt ausgerechnet von der Vorsichtsmaßnahme.
			//
			// `test -e` endet bei einem Treffer mit Exit 0 und nur bei fehlender
			// Datei mit Exit 1. Der Konflikt steht deshalb im `try`-Zweig und
			// das Weitermachen im `catch` — herum, wie man es zuerst erwartet.
			// Kein `sh -c '… && …'`: `ssh` fügt seine Argumente auf der
			// Gegenseite wieder zu einer Kommandozeile zusammen, die dort eine
			// Shell parst — das `&&` würde dann vor `sh` ausgewertet.
			let belegt = true;
			try {
				await lauf([...praefix, 'test', '-e', `${erledigt}/${datei}`]);
			} catch {
				belegt = false;
			}
			if (belegt) throw konflikt(datei);

			await lauf([...praefix, 'mv', `${eingang}/${datei}`, `${erledigt}/${datei}`]);
		}
	};
}

/**
 * Baut den Request-Body aus einem Umschlag.
 *
 * Bevorzugt wird `roh` — das ist wörtlich das, was die App geschickt hat.
 * Ein Re-Serialisieren aus `payload` wäre eine zweite Interpretation der Daten
 * (Zahlenformate, Reihenfolge, Kodierung) und damit genau die Art von stiller
 * Abweichung, die der Legacy-Vertrag nicht verträgt.
 *
 * Ausnahme: ein abgeschnittener Body. Der wäre als Rohtext unparsbar; dann ist
 * der geparste Payload das Einzige, was noch trägt.
 */
function baueAnfrage(umschlag) {
	const contentType = umschlag.quelle?.content_type || 'application/json';

	if (typeof umschlag.roh === 'string' && umschlag.roh !== '' && umschlag.abgeschnitten !== true) {
		return { body: umschlag.roh, contentType };
	}

	return { body: JSON.stringify(umschlag.payload), contentType: 'application/json' };
}

export async function sende({ basisUrl, speicher, fetchImpl = fetch, log = console }) {
	const ziel = new URL('/rest_sichtungen', basisUrl).toString();
	const dateien = await speicher.liste();

	let uebernommen = 0;
	const abgelehnt = [];
	let abbruch = null;

	for (const datei of dateien) {
		let umschlag;

		try {
			umschlag = JSON.parse(await speicher.lies(datei));
		} catch (fehler) {
			// Eine unlesbare Datei hält den Rest nicht auf — sie bleibt liegen
			// und braucht einen Menschen.
			log.error(`${datei}: nicht lesbar (${fehlerText(fehler)}) — bleibt liegen`);
			abgelehnt.push({ datei, grund: fehlerText(fehler) });
			continue;
		}

		if (!umschlag.payload) {
			log.error(`${datei}: kein Payload — bleibt liegen`);
			abgelehnt.push({ datei, grund: 'kein Payload' });
			continue;
		}

		const { body, contentType } = baueAnfrage(umschlag);

		// Der ursprüngliche User-Agent macht die Meldung im Serverprotokoll
		// als App-Meldung erkennbar, statt sie als Node-Aufruf erscheinen zu
		// lassen — und landet seit der Einführung von `eingangs_client` auch
		// an der Sichtung.
		//
		// Kennt der Umschlag keinen User-Agent (der Client schickte keinen,
		// der Handler speichert dann ''), wird KEINER gesetzt: Der Server
		// schreibt dann `unbekannt`. Ein Fallback-Name hier hielte einen
		// Client ohne User-Agent dauerhaft für dieses Werkzeug.
		// Fehlt dagegen `quelle` ganz, ist dieses Werkzeug tatsächlich der
		// Ursprung — dann bleibt der Name stehen.
		const kopfzeilen = { 'content-type': contentType };
		const uebernommenerAgent = umschlag.quelle
			? umschlag.quelle.user_agent?.trim()
			: 'legacy-inbox-import';
		if (uebernommenerAgent) kopfzeilen['user-agent'] = uebernommenerAgent;

		let antwort;
		try {
			antwort = await fetchImpl(ziel, {
				method: 'POST',
				headers: kopfzeilen,
				body
			});
		} catch (fehler) {
			// Ein Netzwerkfehler sagt nichts darüber aus, ob die Sichtung
			// angelegt wurde — die Antwort ist auf dem Weg verloren gegangen,
			// die Anfrage kann den Server sehr wohl erreicht haben. Weiter zu
			// senden wäre falsch: Bei einer abgerissenen Verbindung würde ein
			// späterer Lauf dieselbe Datei erneut schicken. Deshalb Abbruch mit
			// klarer Ansage.
			log.error(`${datei}: Verbindung fehlgeschlagen (${fehlerText(fehler)}) — Lauf abgebrochen`);
			abbruch = { grund: 'netzwerk', datei, meldung: fehlerText(fehler) };
			break;
		}

		if (antwort.status === 429) {
			log.error(
				`${datei}: Rate-Limit erreicht (429). Der Endpunkt lässt 20 Meldungen pro Stunde und ` +
					`IP zu. Lauf abgebrochen — in einer Stunde erneut starten, ${datei} und alles ` +
					`Folgende liegen unverändert im Posteingang.`
			);
			abbruch = { grund: 'rate-limit', datei };
			break;
		}

		if (antwort.status !== 201) {
			// Der Endpunkt hat die Meldung inhaltlich abgelehnt. Sie bleibt
			// liegen — genau wie ein Eintrag in abgewiesen/ ein Warnsignal ist
			// und einen Menschen braucht.
			const text = await antwort.text().catch(() => '');
			log.error(`${datei}: abgelehnt mit HTTP ${antwort.status} — ${text.slice(0, 300)}`);
			abgelehnt.push({ datei, http: antwort.status, antwort: text.slice(0, 300) });
			continue;
		}

		const ort = antwort.headers.get('location');

		// Ab hier existiert die Sichtung in der Zieldatenbank. Scheitert jetzt
		// das Verschieben, ist das eine gescheiterte Aufräumarbeit an einem
		// abgeschlossenen Vorgang — und der einzige Fall, in dem ein weiterer
		// Lauf etwas doppelt anlegen könnte. Deshalb sofortiger Abbruch mit
		// Nennung der Datei, gleiche Begründung wie in import-legacy-inbox.js.
		try {
			await speicher.verschiebe(datei);
		} catch (fehler) {
			log.error(
				`${datei}: Sichtung wurde angelegt (${ort}), aber die Datei konnte nicht nach ` +
					`importiert/ verschoben werden (${fehlerText(fehler)}). Datei von Hand verschieben, ` +
					`bevor der Lauf wiederholt wird — sonst wird die Sichtung doppelt angelegt.`
			);
			abbruch = { grund: 'verschieben', datei, sichtungId: ort, meldung: fehlerText(fehler) };
			break;
		}

		uebernommen++;
		log.log(`${datei} → ${ort}`);
	}

	return { uebernommen, abgelehnt, abbruch, gesamt: dateien.length };
}
