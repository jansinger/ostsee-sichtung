/**
 * Erzeugt lokal vertrauenswürdige TLS-Zertifikate für den Dev-Server (https://localhost:4000).
 *
 * mkcert legt eine eigene CA an und trägt sie in den System-Trust-Store ein. Chrome
 * akzeptiert davon ausgestellte Zertifikate ohne Warnung, weil die CT- und Laufzeit-
 * Regeln nur für öffentliche CAs gelten, nicht für lokal installierte.
 *
 * Läuft automatisch vor `npm run dev`, manuell über `npm run certs:setup`. Das Skript
 * beendet sich in jedem Fehlerfall mit Exit 0: fehlt mkcert oder geht sonst etwas schief,
 * fällt vite.config.ts auf @vitejs/plugin-basic-ssl zurück (Chrome warnt dann wieder).
 */
import { spawnSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CERT_DIR = fileURLToPath(new URL('../certs/', import.meta.url));
const CERT_FILE = fileURLToPath(new URL('../certs/localhost.pem', import.meta.url));
const KEY_FILE = fileURLToPath(new URL('../certs/localhost-key.pem', import.meta.url));

/** Namen, für die das Zertifikat gilt — muss zu server.host in vite.config.ts passen */
const DOMAINS = ['localhost', '127.0.0.1', '::1', '*.local.dev'];

/** Neu ausstellen, sobald weniger als 30 Tage Restlaufzeit bleiben */
const RENEW_BEFORE_MS = 30 * 24 * 60 * 60 * 1000;

const INSTALL_DOCS = 'https://github.com/FiloSottile/mkcert#installation';

/** Beispielbefehl je Plattform — die vollständige Anleitung steht unter INSTALL_DOCS */
const INSTALL_EXAMPLES = {
	darwin: 'brew install mkcert nss',
	win32: 'choco install mkcert',
	linux: 'sudo apt install libnss3-tools && brew install mkcert'
};

/** Führt mkcert aus; stdio: 'inherit', damit die Passwortabfrage von `-install` funktioniert. */
function mkcert(args, options = {}) {
	return spawnSync('mkcert', args, { stdio: 'inherit', ...options });
}

function hasValidCertificate() {
	if (!existsSync(CERT_FILE) || !existsSync(KEY_FILE)) return false;
	try {
		const { validToDate } = new X509Certificate(readFileSync(CERT_FILE));
		return validToDate.getTime() - Date.now() > RENEW_BEFORE_MS;
	} catch {
		// Unlesbares Zertifikat wie ein fehlendes behandeln, damit es neu ausgestellt wird
		return false;
	}
}

function reportMissingMkcert() {
	const example = INSTALL_EXAMPLES[process.platform] ?? INSTALL_EXAMPLES.linux;
	console.log(
		[
			'certs: mkcert nicht gefunden — der Dev-Server nutzt ein selbstsigniertes',
			'       Zertifikat, Chrome zeigt deshalb eine Sicherheitswarnung.',
			'',
			`       Installationsanleitung: ${INSTALL_DOCS}`,
			`       Beispiel für ${process.platform}: ${example}`,
			'',
			'       Danach einmalig: npm run certs:setup'
		].join('\n')
	);
}

function setup() {
	// In CI gibt es keinen Trust-Store, den wir sinnvoll bespielen könnten —
	// dort läuft der Server ohnehin über vite.config.ci.ts ohne HTTPS.
	if (process.env.CI) {
		console.log('certs: CI erkannt — überspringe mkcert-Setup');
		return;
	}

	const caRoot = spawnSync('mkcert', ['-CAROOT'], { encoding: 'utf8' });
	if (caRoot.error?.code === 'ENOENT') {
		reportMissingMkcert();
		return;
	}

	if (hasValidCertificate()) {
		console.log('certs: Zertifikat in certs/ ist gültig');
		return;
	}

	// Die lokale CA muss im Trust-Store liegen, sonst warnt Chrome trotz mkcert-Zertifikat.
	// `mkcert -install` ist idempotent; nur die Erstinstallation fragt nach dem Passwort.
	const rootCa = new URL('rootCA.pem', `file://${caRoot.stdout.trim()}/`);
	if (!existsSync(rootCa)) {
		if (!process.stdin.isTTY) {
			console.log('certs: lokale CA fehlt und die Installation braucht eine Eingabeaufforderung.');
			console.log("       Bitte einmalig 'npm run certs:setup' in einem Terminal ausführen.");
			return;
		}
		console.log('certs: lege lokale CA an und installiere sie im Trust-Store');
		console.log('       (das Betriebssystem fragt dafür ggf. nach deinem Passwort)');
	}
	mkcert(['-install']);

	mkdirSync(CERT_DIR, { recursive: true });
	const result = mkcert(['-cert-file', CERT_FILE, '-key-file', KEY_FILE, ...DOMAINS]);
	if (result.status !== 0) {
		console.warn(`certs: mkcert endete mit Status ${result.status} — nutze Fallback-Zertifikat`);
		return;
	}

	chmodSync(KEY_FILE, 0o600);
	console.log(`certs: Zertifikat für ${DOMAINS.join(', ')} in certs/ erstellt`);
}

try {
	setup();
} catch (error) {
	// Zertifikate sind ein Komfort-Feature — ein Fehler hier darf `npm run dev` nicht blockieren.
	console.warn(`certs: Setup übersprungen (${error.message})`);
}
