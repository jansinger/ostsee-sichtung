import { leseKonfiguration } from './src/config.js';
import { erstelleServer } from './src/server.js';
import { erstelleStore } from './src/store.js';
import { erstelleRateLimit } from './src/rateLimit.js';

const konfiguration = leseKonfiguration(process.env);
const store = await erstelleStore({ datenVerzeichnis: konfiguration.datenVerzeichnis });
await store.initialisiere();

const rateLimit = erstelleRateLimit({
	proIpProStunde: konfiguration.rateLimitProIp,
	globalProStunde: konfiguration.rateLimitGlobal
});

const server = erstelleServer({ konfiguration, store, rateLimit });
server.listen(konfiguration.port, () => {
	console.log(`legacy-inbox lauscht auf Port ${konfiguration.port}`);
	console.log(`Datenverzeichnis: ${konfiguration.datenVerzeichnis}`);
});
