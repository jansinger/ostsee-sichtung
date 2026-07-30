import { leseKonfiguration } from './src/config.js';
import { erstelleServer } from './src/server.js';
import { erstelleStore } from './src/store.js';
import { erstelleRateLimit } from './src/rateLimit.js';
import { pruefeStartbedingungen } from './src/startPruefung.js';

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
