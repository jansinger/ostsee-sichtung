/**
 * Einstiegspunkt des Dienstes.
 *
 * **Hier darf kein Top-Level-`await` stehen.** Phusion Passenger lädt die
 * Anwendung über `require()`
 * (`/usr/share/passenger/helper-scripts/node-loader.js`). Node kann ein
 * ESM-Modul aus CJS heraus laden, aber nur wenn dessen Graph kein
 * Top-Level-`await` enthält — sonst bricht der Start mit
 * `ERR_REQUIRE_ASYNC_MODULE` ab, bevor eine Zeile eigener Code läuft.
 *
 * Ein direkter Aufruf (`node app.js`) verträgt Top-Level-`await` dagegen
 * anstandslos. Der Unterschied fällt deshalb erst auf dem Server auf, und dort
 * als Startfehler ohne erkennbaren Bezug zum eigenen Code. Der asynchrone Teil
 * gehört darum in `starte()`.
 *
 * Dass `server.listen()` erst asynchron aufgerufen wird, stört Passenger
 * nicht — es wartet darauf, dass die Anwendung zu lauschen beginnt.
 */
import { leseKonfiguration } from './src/config.js';
import { erstelleServer } from './src/server.js';
import { erstelleStore } from './src/store.js';
import { erstelleRateLimit } from './src/rateLimit.js';
import { pruefeStartbedingungen } from './src/startPruefung.js';

async function starte() {
	const konfiguration = leseKonfiguration(process.env);
	const store = await erstelleStore({ datenVerzeichnis: konfiguration.datenVerzeichnis });
	await store.initialisiere();

	// Beschreibbarkeit ist Abbruchgrund, knapper Platz nur ein lauter Hinweis —
	// Begründung beider Entscheidungen in src/startPruefung.js.
	try {
		await pruefeStartbedingungen({ store, datenVerzeichnis: konfiguration.datenVerzeichnis });
	} catch (fehler) {
		console.error(fehler.message);
		process.exit(1);
	}

	const rateLimit = erstelleRateLimit({
		proIpProStunde: konfiguration.rateLimitProIp,
		globalProStunde: konfiguration.rateLimitGlobal
	});

	const server = erstelleServer({ konfiguration, store, rateLimit });
	server.listen(konfiguration.port, () => {
		console.log(`legacy-inbox lauscht auf Port ${konfiguration.port}`);
		console.log(`Datenverzeichnis: ${konfiguration.datenVerzeichnis}`);
	});
}

starte().catch((fehler) => {
	// Fängt unter anderem die fehlende Umgebungsvariable ab, die
	// leseKonfiguration() wirft. Ohne diesen Handler bliebe davon nur eine
	// unbehandelte Promise-Ablehnung übrig.
	console.error(fehler instanceof Error ? fehler.message : String(fehler));
	process.exit(1);
});
