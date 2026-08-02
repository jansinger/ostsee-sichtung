/**
 * Macht überprüfbar, aus welchem Arbeitsverzeichnis ein Dev-Server ausliefert.
 *
 * Hintergrund: `playwright.config.ts` setzt lokal `reuseExistingServer`. Antwortet auf
 * dem konfigurierten Port *irgendein* Server, benutzt Playwright ihn — ohne zu prüfen,
 * woher der Code stammt. Weil alle Worktrees denselben Port benutzten, liefen E2E-Tests
 * dann gegen einen fremden Branch. Der laute Fall (32 Fehlschläge für längst behobene
 * Fundstellen) fällt auf; der gefährliche ist der stille: Der fremde Worktree hat die
 * Stelle zufällig sauber, der Test wird grün, die eigene Regression bleibt unentdeckt.
 *
 * Zwei Ebenen dagegen:
 *  1. `worktreeDevPort` gibt jedem Arbeitsverzeichnis seinen eigenen Port und macht den
 *     Zusammenstoß damit unwahrscheinlich — nicht unmöglich (Hash auf ein endliches
 *     Fenster, siehe `PORT_RANGE_SIZE`).
 *  2. `assertServerIdentity` prüft vor den Tests, ob der Server aus dem eigenen
 *     Verzeichnis ausliefert, und **bricht ab**, wenn nicht. Stillschweigend fremden
 *     Code zu testen ist der Fehler, der verhindert werden soll — eine Warnung, die im
 *     Log untergeht, reicht dafür nicht.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Pfad, unter dem der Dev-Server sein Wurzelverzeichnis meldet. */
export const DEV_IDENTITY_PATH = '/__dev-server-identity';

/**
 * Port-Fenster für Dev-Server: 41000–44999.
 *
 * Deutlich oberhalb von 4000 (fester Dev-Port, an dem `PUBLIC_SITE_URL` und die
 * Auth0-Callback-URL hängen) und 4001 (der frühere, für alle Worktrees identische
 * E2E-Port), unterhalb des ephemeren Bereichs (ab 49152 auf macOS) und abseits der
 * üblichen Dienste in den 3000ern/4000ern/5000ern (5000 belegt macOS für AirPlay).
 *
 * Die Breite bestimmt, wie oft zwei Worktrees denselben Port ziehen — ein
 * Geburtstagsproblem, kein „kann nicht passieren". Mit 4000 Plätzen: ~1 % bei 10
 * Worktrees, ~5 % bei 20. Tritt es ein, ist es **nicht** stillschweigend falsch,
 * sondern laut: `assertServerIdentity` bricht ab und nennt beide Verzeichnisse.
 */
const PORT_RANGE_START = 41_000;
const PORT_RANGE_SIZE = 4_000;

/** Entfernt abschließende Schrägstriche, damit Pfadvarianten denselben Port ergeben. */
function normalizeRoot(root: string): string {
	return root.replace(/\/+$/, '');
}

/**
 * Leitet aus dem Arbeitsverzeichnis einen stabilen Port ab.
 *
 * Deterministisch (derselbe Worktree bekommt über Läufe hinweg denselben Port, was
 * `reuseExistingServer` erst nutzbar macht) und ohne Abstimmung zwischen parallelen
 * Sessions. Kollisionen zwischen zwei Worktrees sind bei 400 Ports theoretisch möglich —
 * dagegen greift dann `assertServerIdentity`.
 */
export function worktreeDevPort(root: string): number {
	const digest = createHash('sha256').update(normalizeRoot(root)).digest();
	return PORT_RANGE_START + (digest.readUInt32BE(0) % PORT_RANGE_SIZE);
}

/**
 * Vertrauensanker für die lokalen Dev-Zertifikate.
 *
 * Bewusst **keine** abgeschaltete Zertifikatsprüfung: Die mkcert-CA liegt einmal pro
 * Maschine und deckt damit die Zertifikate *aller* Worktrees ab — sie zu pinnen leistet
 * dasselbe wie `rejectUnauthorized: false`, ohne das Muster in die Codebasis zu tragen.
 * Ergänzt um das eigene `basic-ssl`-Zertifikat für den Fall, dass mkcert fehlt
 * (`vite.config.ts` fällt dann auf `@vitejs/plugin-basic-ssl` zurück).
 *
 * Ist gar kein Anker zu finden, bleibt der System-Store aktiv und der Handshake
 * scheitert — der E2E-Lauf bricht dann mit „nicht erreichbar" ab statt fremden Code zu
 * testen. Fail-closed ist hier die richtige Richtung.
 */
let cachedAnchors: Buffer[] | undefined;

export function devTrustAnchors(): Buffer[] {
	if (cachedAnchors) return cachedAnchors;

	const anchors: Buffer[] = [];
	// Gleiche Auflösung wie scripts/setup-dev-certs.mjs — mkcert kennt seinen CA-Pfad selbst.
	const caRoot = spawnSync('mkcert', ['-CAROOT'], { encoding: 'utf8' });
	if (caRoot.status === 0) {
		const rootCa = path.join(caRoot.stdout.trim(), 'rootCA.pem');
		if (existsSync(rootCa)) anchors.push(readFileSync(rootCa));
	}

	const basicSsl = path.join(process.cwd(), 'certs', 'basic-ssl', '_cert.pem');
	if (existsSync(basicSsl)) anchors.push(readFileSync(basicSsl));

	cachedAnchors = anchors;
	return anchors;
}

/**
 * `fetch`-Ersatz auf Basis von `node:https`, der den lokalen Dev-Zertifikaten traut —
 * und sonst nichts nachlässt.
 *
 * Warum nicht das globale `fetch`: Ob es den System-Trust-Store (und damit die
 * mkcert-CA) liest, hängt an der Node-Version — auf den in `engines` erlaubten 20/22
 * nicht. Dort bräche die Prüfung am Zertifikat ab und meldete „nicht erreichbar",
 * obwohl der Server läuft: genau die irreführende Diagnose, gegen die dieses Modul
 * geschrieben ist. Mit explizit gesetzten Ankern ist das Verhalten von der
 * Node-Version unabhängig. Bewusst ohne `undici` — das Paket liegt nur transitiv im
 * Abhängigkeitsbaum.
 */
export function createNodeIdentityFetch(timeoutMs = 10_000): IdentityFetch {
	return (url, init) =>
		new Promise((resolve, reject) => {
			const { request } = url.startsWith('https:') ? https : http;
			const anchors = devTrustAnchors();
			const signal = init?.signal;
			/**
			 * Genau **eine** Frist. Bringt der Aufrufer ein Signal mit (in
			 * `assertServerIdentity` ein `AbortSignal.timeout`), gilt dessen Deadline und
			 * der Socket-Timeout entfällt — sonst liefen zwei Uhren, von denen die eine
			 * die andere überholen kann und die Fehlermeldung davon abhinge, wer zuerst war.
			 */
			const req = request(
				url,
				{ ...(signal ? {} : { timeout: timeoutMs }), ...(anchors.length ? { ca: anchors } : {}) },
				(res) => {
					let body = '';
					res.setEncoding('utf8');
					res.on('data', (chunk) => (body += chunk));
					res.on('end', () => {
						const status = res.statusCode ?? 0;
						resolve({ ok: status >= 200 && status < 300, json: async () => JSON.parse(body) });
					});
				}
			);
			req.on('timeout', () => req.destroy(new Error(`Zeitüberschreitung nach ${timeoutMs} ms`)));
			req.on('error', reject);

			const onAbort = () => req.destroy(new Error('Abgebrochen'));
			signal?.addEventListener('abort', onAbort);
			// `close` deckt alle Ausgänge ab (Antwort, Fehler, destroy). Ohne dieses
			// Abmelden feuerte ein `AbortSignal.timeout` auch noch Sekunden nach der
			// fertigen Antwort und zerstörte einen längst abgeschlossenen Request; bis
			// dahin hielte der Listener ihn zudem am Leben.
			req.on('close', () => signal?.removeEventListener('abort', onAbort));
			req.end();
		});
}

export const nodeIdentityFetch = createNodeIdentityFetch();

/**
 * Fragt den Identitäts-Endpunkt ab und gibt das ausliefernde Verzeichnis zurück —
 * oder `null`, wenn dort kein Dev-Server dieses Projekts antwortet.
 */
export async function describePortOwner(
	origin: string,
	fetchImpl: IdentityFetch = nodeIdentityFetch
): Promise<string | null> {
	try {
		const response = await fetchImpl(`${origin.replace(/\/+$/, '')}${DEV_IDENTITY_PATH}`);
		if (!response.ok) return null;
		const payload = (await response.json()) as { root?: unknown };
		return typeof payload.root === 'string' ? payload.root : null;
	} catch {
		return null;
	}
}

/**
 * Vite-Plugin, das den Identitäts-Endpunkt bereitstellt.
 *
 * Nur `configureServer`, also ausschließlich im Dev-Server — in den Production-Build
 * gelangt der Endpunkt nicht. Bewusst kein SvelteKit-Route-File: eine Route unter
 * `src/routes/` würde mit ausgeliefert.
 */
export function devServerIdentity(): Plugin {
	return {
		name: 'ostsee:dev-server-identity',
		async configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url !== DEV_IDENTITY_PATH) {
					next();
					return;
				}
				res.setHeader('content-type', 'application/json');
				res.end(JSON.stringify({ root: process.cwd() }));
			});

			/**
			 * `strictPort` bricht bei belegtem Port ab — sagt aber nur „Port X is already
			 * in use", nicht *wer* ihn hält. Genau das ist die Frage, die bei mehreren
			 * Worktrees Zeit kostet. `configureServer` wird von Vite abgewartet und läuft
			 * vor dem Bind; die Diagnose steht damit vor Vites Fehlermeldung. (Die von
			 * `configureServer` *zurückgegebene* Post-Hook-Funktion wäre dafür untauglich:
			 * Vite ruft sie synchron auf und wartet ein Promise nicht ab.)
			 *
			 * Bewusst nur ausgeben, nie selbst werfen: Die Garantie liefert `strictPort`.
			 * Und bewusst nicht unter Vitest — dessen Vite-Server bindet den Port gar
			 * nicht, jede Meldung wäre dort ein Fehlalarm im Testlauf.
			 */
			if (process.env.VITEST) return;
			const { port, https: useHttps } = server.config.server;
			const origin = `${useHttps ? 'https' : 'http'}://localhost:${port}`;
			// Kurzer Timeout: Ist der Port frei, antwortet der Connect sofort mit
			// ECONNREFUSED — der Wert greift nur bei einem hängenden Fremdprozess.
			const owner = await describePortOwner(origin, createNodeIdentityFetch(1500));
			if (!owner || normalizeRoot(owner) === normalizeRoot(process.cwd())) return;
			server.config.logger.warn(
				`\nPort ${port} wird bereits von einem Dev-Server bedient — aus:\n` +
					`  ${owner}\n` +
					`Dieses Verzeichnis ist:\n  ${process.cwd()}\n`
			);
		}
	};
}

/**
 * Nur das, was die Prüfung wirklich braucht. Das globale `fetch` erfüllt die Signatur;
 * ebenso ein schlanker `node:https`-Adapter, wie ihn `e2e/global-setup.ts` für das
 * selbstsignierte Dev-Zertifikat mitbringt.
 */
export type IdentityFetch = (
	url: string,
	init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface AssertServerIdentityOptions {
	/** Basis-URL des Servers, gegen den getestet wird (ohne Pfad). */
	url: string;
	/** Verzeichnis, aus dem ausgeliefert werden *soll* — üblicherweise `process.cwd()`. */
	expectedRoot: string;
	/**
	 * Default ist bewusst `nodeIdentityFetch` und nicht das globale `fetch`: Letzteres
	 * scheitert je nach Node-Version am selbstsignierten Dev-Zertifikat und meldete
	 * dann „nicht erreichbar" für einen laufenden Server.
	 */
	fetchImpl?: IdentityFetch;
}

/**
 * Stellt sicher, dass unter `url` der Dev-Server des eigenen Arbeitsverzeichnisses
 * läuft. Wirft mit einer Meldung, die beide Verzeichnisse nennt.
 */
export async function assertServerIdentity({
	url,
	expectedRoot,
	fetchImpl = nodeIdentityFetch
}: AssertServerIdentityOptions): Promise<void> {
	const identityUrl = `${url.replace(/\/+$/, '')}${DEV_IDENTITY_PATH}`;

	// Nicht erreichbar und „antwortet, ist aber nicht unser Dev-Server" sind zwei
	// verschiedene Befunde — deshalb getrennt behandelt statt über die Fehlermeldung
	// wieder auseinandersortiert.
	let payload: { root?: unknown } = {};
	try {
		const response = await fetchImpl(identityUrl, { signal: AbortSignal.timeout(10_000) });
		if (response.ok) payload = (await response.json().catch(() => ({}))) as { root?: unknown };
	} catch (error) {
		// Ein TLS-Fehler sieht sonst aus wie „Server läuft nicht" — der häufigste Grund
		// ist aber ein Dev-Zertifikat ohne passenden Anker (mkcert nicht installiert).
		const hint = /certificate|self.signed|CERT_/i.test(String(error))
			? '\nDas Zertifikat ist keinem lokalen Anker zuzuordnen — läuft `npm run certs:setup`?'
			: '';
		throw new Error(`Der Dev-Server unter ${url} ist nicht erreichbar (${identityUrl}).${hint}`, {
			cause: error
		});
	}

	if (typeof payload.root !== 'string') {
		throw new Error(
			`Der Server unter ${url} identifiziert sich nicht als Dev-Server dieses Projekts ` +
				`(${identityUrl} lieferte kein Wurzelverzeichnis).\n` +
				`Läuft dort etwas anderes? Prüfen mit:\n` +
				`  lsof -a -p $(lsof -ti:${new URL(url).port}) -d cwd`
		);
	}

	const actualRoot = payload.root;
	if (normalizeRoot(actualRoot) === normalizeRoot(expectedRoot)) return;

	throw new Error(
		[
			'E2E-Abbruch: Der Server liefert aus einem fremden Arbeitsverzeichnis aus.',
			'',
			`  URL:       ${url}`,
			`  liefert:   ${actualRoot}`,
			`  erwartet:  ${expectedRoot}`,
			'',
			'Die Tests hätten fremden Code geprüft — ein grünes Ergebnis wäre wertlos gewesen.',
			'',
			'Behebung: den fremden Server beenden und erneut starten —',
			`  kill $(lsof -ti:${new URL(url).port})`
		].join('\n')
	);
}
