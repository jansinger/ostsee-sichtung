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
 *  1. `worktreeDevPort` gibt jedem Arbeitsverzeichnis einen eigenen Port — Kollisionen
 *     entstehen erst gar nicht.
 *  2. `assertServerIdentity` prüft vor den Tests, ob der Server aus dem eigenen
 *     Verzeichnis ausliefert, und **bricht ab**, wenn nicht. Stillschweigend fremden
 *     Code zu testen ist der Fehler, der verhindert werden soll — eine Warnung, die im
 *     Log untergeht, reicht dafür nicht.
 */
import { createHash } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import type { Plugin } from 'vite';

/** Pfad, unter dem der Dev-Server sein Wurzelverzeichnis meldet. */
export const DEV_IDENTITY_PATH = '/__dev-server-identity';

/**
 * Port-Fenster für Dev-Server. Beginnt bewusst oberhalb von 4000 (fester Dev-Port, an
 * dem `PUBLIC_SITE_URL` und die Auth0-Callback-URL hängen) und 4001 (der frühere,
 * für alle Worktrees identische E2E-Port).
 */
const PORT_RANGE_START = 4100;
const PORT_RANGE_SIZE = 400;

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
 * `fetch`-Ersatz auf Basis von `node:https`.
 *
 * Das lokale Dev-Zertifikat ist selbstsigniert und wird von der mkcert-CA im
 * System-Store gedeckt. Ob das globale `fetch` diesen Store liest, hängt an der
 * Node-Version — auf den in `engines` erlaubten 20/22 nicht. Dort bräche die Prüfung
 * am Zertifikat ab und meldete „nicht erreichbar", obwohl der Server läuft: genau die
 * irreführende Diagnose, gegen die dieses Modul geschrieben ist. Deshalb hier
 * unabhängig von der Node-Version explizit. Bewusst ohne `undici` — das Paket liegt
 * nur transitiv im Abhängigkeitsbaum.
 */
export function createNodeIdentityFetch(timeoutMs = 10_000): IdentityFetch {
	return (url, init) =>
		new Promise((resolve, reject) => {
			const { request } = url.startsWith('https:') ? https : http;
			const req = request(url, { rejectUnauthorized: false, timeout: timeoutMs }, (res) => {
				let body = '';
				res.setEncoding('utf8');
				res.on('data', (chunk) => (body += chunk));
				res.on('end', () => {
					const status = res.statusCode ?? 0;
					resolve({ ok: status >= 200 && status < 300, json: async () => JSON.parse(body) });
				});
			});
			req.on('timeout', () => req.destroy(new Error(`Zeitüberschreitung nach ${timeoutMs} ms`)));
			req.on('error', reject);
			// Ein übergebenes Signal muss wirken — sonst gäbe es zwei Timeouts, von denen
			// nur einer greift.
			init?.signal?.addEventListener('abort', () => req.destroy(new Error('Abgebrochen')), {
				once: true
			});
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
		throw new Error(`Der Dev-Server unter ${url} ist nicht erreichbar (${identityUrl}).`, {
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
